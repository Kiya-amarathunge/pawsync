/**
 * PawSync API route: /api/admin/analytics
 *
 * Domain: administration, moderation, reporting, and platform oversight.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Appointment from '@/models/Appointment';
import Review from '@/models/Review';
import { verifyToken } from '@/lib/jwt';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// GET /api/admin/analytics?period=week|month
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const period = req.nextUrl.searchParams.get('period') || 'month';
    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const [
      newUsers,
      newProviders,
      appointmentsCompleted,
      appointmentsCancelled,
      reviews,
    ] = await Promise.all([
      User.countDocuments({ registrationDate: { $gte: startDate }, role: 'pet_owner' }),
      User.countDocuments({ registrationDate: { $gte: startDate }, role: { $in: ['veterinarian', 'service_provider'] } }),
      Appointment.countDocuments({ status: 'completed', dateTime: { $gte: startDate } }),
      Appointment.countDocuments({ status: 'cancelled', dateTime: { $gte: startDate } }),
      Review.find({ createdAt: { $gte: startDate } }),
    ]);

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // Top providers by completed appointments
    const topProvidersRaw = await Appointment.aggregate([
      { $match: { status: 'completed', dateTime: { $gte: startDate } } },
      { $group: { _id: '$providerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Top services
    const topServicesRaw = await Appointment.aggregate([
      { $match: { status: 'completed', dateTime: { $gte: startDate } } },
      { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return NextResponse.json({
      period,
      newUsers,
      newProviders,
      appointmentsCompleted,
      appointmentsCancelled,
      avgRating: Math.round(avgRating * 10) / 10,
      topProviders: topProvidersRaw,
      topServices: topServicesRaw,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import Review from '@/models/Review';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET /api/provider/dashboard/stats
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayAppointments,
      pendingRequests,
      weekAppointments,
      monthAppointments,
      reviews,
      completedTotal,
      cancelledTotal,
    ] = await Promise.all([
      Appointment.countDocuments({
        providerId: user.userId,
        dateTime: { $gte: today, $lt: tomorrow },
        status: { $in: ['confirmed', 'pending'] },
      }),
      Appointment.countDocuments({ providerId: user.userId, status: 'pending' }),
      Appointment.find({
        providerId: user.userId,
        dateTime: { $gte: startOfWeek },
        status: 'completed',
      }),
      Appointment.find({
        providerId: user.userId,
        dateTime: { $gte: startOfMonth },
        status: 'completed',
      }),
      Review.find({ providerId: user.userId }),
      Appointment.countDocuments({ providerId: user.userId, status: 'completed' }),
      Appointment.countDocuments({ providerId: user.userId, status: 'cancelled' }),
    ]);

    const weekRevenue = weekAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const monthRevenue = monthAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
    const completionRate =
      completedTotal + cancelledTotal > 0
        ? Math.round((completedTotal / (completedTotal + cancelledTotal)) * 100)
        : 0;

    return NextResponse.json({
      todayAppointments,
      pendingRequests,
      weekRevenue,
      monthRevenue,
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
      completionRate,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

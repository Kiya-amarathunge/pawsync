/**
 * PawSync API route: /api/provider/dashboard/analytics
 *
 * Domain: provider profiles, dashboards, and operations.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET /api/provider/dashboard/analytics
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const appointments = await Appointment.find({
      providerId: user.userId,
      status: 'completed',
    });

    // Most popular services
    const serviceCount: Record<string, number> = {};
    appointments.forEach((a) => {
      serviceCount[a.serviceType] = (serviceCount[a.serviceType] || 0) + 1;
    });

    // Peak booking hours
    const hourCount: Record<number, number> = {};
    appointments.forEach((a) => {
      const hour = new Date(a.dateTime).getHours();
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });

    const popularServices = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .map(([service, count]) => ({ service, count }));

    const peakHours = Object.entries(hourCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, count]) => ({
        hour: `${hour}:00`,
        count,
      }));

    return NextResponse.json({ popularServices, peakHours });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

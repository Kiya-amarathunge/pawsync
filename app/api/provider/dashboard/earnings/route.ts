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

// GET /api/provider/dashboard/earnings
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const period = req.nextUrl.searchParams.get('period') || 'monthly';

    const today = new Date();
    const startDate = new Date();

    if (period === 'daily') {
      startDate.setDate(today.getDate() - 7);
    } else if (period === 'weekly') {
      startDate.setDate(today.getDate() - 28);
    } else {
      startDate.setMonth(today.getMonth() - 6);
    }

    const appointments = await Appointment.find({
      providerId: user.userId,
      status: 'completed',
      dateTime: { $gte: startDate },
    }).sort({ dateTime: 1 });

    // Group by period
    const earningsMap: Record<string, number> = {};

    appointments.forEach((a) => {
      const date = new Date(a.dateTime);
      let key = '';
      if (period === 'daily') {
        key = date.toLocaleDateString();
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toLocaleDateString();
      } else {
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      }
      earningsMap[key] = (earningsMap[key] || 0) + (a.price || 0);
    });

    const labels = Object.keys(earningsMap);
    const data = Object.values(earningsMap);
    const total = data.reduce((sum, v) => sum + v, 0);

    return NextResponse.json({ labels, data, total, period });
  } catch (error) {
    console.error('Earnings error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

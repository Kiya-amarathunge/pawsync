import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Appointment from '@/models/Appointment';
import ForumPost from '@/models/ForumPost';
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

// GET /api/admin/dashboard
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      activeUsers,
      pendingVerifications,
      flaggedPosts,
      flaggedReviews,
      todayAppointments,
      pendingAppointments,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ registrationDate: { $gte: today } }),
      User.countDocuments({ registrationDate: { $gte: last24h } }),
      User.countDocuments({ isVerified: true, isActive: false, role: { $in: ['veterinarian', 'service_provider'] } }),
      ForumPost.countDocuments({ isFlagged: true, isModerated: false }),
      Review.countDocuments({ isModerated: true }),
      Appointment.countDocuments({ dateTime: { $gte: today } }),
      Appointment.countDocuments({ status: 'pending' }),
    ]);

    return NextResponse.json({
      totalUsers,
      newUsersToday,
      activeUsers,
      pendingVerifications,
      flaggedPosts,
      flaggedReviews,
      todayAppointments,
      pendingAppointments,
      systemHealth: {
        status: 'healthy',
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

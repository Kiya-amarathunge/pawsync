import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';
import { verifyToken } from '@/lib/jwt';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// POST /api/admin/announcements
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, message, targetRoles } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const roleFilter = targetRoles && targetRoles.length > 0
      ? { role: { $in: targetRoles } }
      : {};

    const users = await User.find({ ...roleFilter, isActive: true }).select('_id');

    // Create notification for each user
    await Promise.all(
      users.map((user) =>
        Notification.create({
          userId: user._id,
          type: 'ANNOUNCEMENT',
          message: `${title}: ${message}`,
          isRead: false,
        })
      )
    );

    await AuditLog.create({
      adminId: admin.userId,
      actionType: 'ANNOUNCEMENT_SENT',
      affectedEntity: 'User',
      entityId: admin.userId,
      justification: `Announcement sent to ${users.length} users: ${title}`,
    });

    return NextResponse.json({
      message: `Announcement sent to ${users.length} users successfully`,
    });
  } catch (error) {
    console.error('Send announcement error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

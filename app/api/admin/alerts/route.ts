/**
 * PawSync API route: /api/admin/alerts
 *
 * Domain: administration, moderation, reporting, and platform oversight.
 * Methods: POST, GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
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

// POST /api/admin/alerts - send a seasonal disease outbreak alert
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, message, affectedArea } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    // Get all active pet owners
    const users = await User.find({
      role: 'pet_owner',
      isActive: true,
    }).select('_id');

    const fullMessage = `Health Alert${affectedArea ? ` for ${affectedArea}` : ''}: ${title} - ${message}`;

    let notificationsSent = 0;
    for (const user of users) {
      // Create in-app notification
      await Notification.create({
        userId: user._id,
        type: 'SEASONAL_ALERT',
        message: fullMessage,
        isRead: false,
      });
      notificationsSent++;

    }

    // Log admin action
    await AuditLog.create({
      adminId: admin.userId,
      actionType: 'OUTBREAK_ALERT_SENT',
      affectedEntity: 'User',
      entityId: admin.userId,
      justification: `Seasonal alert sent: ${title} - affected area: ${affectedArea || 'all'}`,
    });

    return NextResponse.json({
      message: 'Alert sent successfully',
      notificationsSent,
    });
  } catch (error) {
    console.error('Send alert error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// GET /api/admin/alerts - list recent alerts from the audit log
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const alerts = await AuditLog.find({ actionType: 'OUTBREAK_ALERT_SENT' })
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('adminId', 'name');

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

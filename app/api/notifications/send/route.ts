import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { sendSMS } from '@/lib/twilio';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// POST /api/notifications/send
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId, type, message, sendSMSAlert } = await req.json();

    if (!userId || !type || !message) {
      return NextResponse.json({ error: 'userId, type and message are required' }, { status: 400 });
    }

    // Rate limit: max 10 notifications per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await Notification.countDocuments({
      userId,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentCount >= 10) {
      return NextResponse.json(
        { error: 'Notification rate limit reached for this user' },
        { status: 429 }
      );
    }

    // Create in-app notification
    const notification = await Notification.create({
      userId,
      type,
      message,
      isRead: false,
    });

    // Send SMS if requested and user has a phone number
    let smsSent = false;
    if (sendSMSAlert) {
      const targetUser = await User.findById(userId);
      if (targetUser?.phoneNumber) {
        smsSent = await sendSMS(targetUser.phoneNumber, `PawSync: ${message}`);
        if (smsSent) {
          await Notification.findByIdAndUpdate(notification._id, {
            $set: { deliveredViaSMS: true },
          });
        }
      }
    }

    return NextResponse.json({
      message: 'Notification sent successfully',
      notification,
      smsSent,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

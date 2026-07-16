/**
 * PawSync API route: /api/notifications/[id]/read
 *
 * Domain: notifications, preferences, and delivery.
 * Methods: PATCH.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// PATCH /api/notifications/[id]/read
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });

    return NextResponse.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
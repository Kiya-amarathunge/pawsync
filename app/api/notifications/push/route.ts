/**
 * PawSync API route: /api/notifications/push
 *
 * Domain: notifications, preferences, and delivery.
 * Methods: GET, POST, DELETE.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PushSubscription from '@/models/PushSubscription';
import { getRequestUser } from '@/lib/request-auth';

export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

export async function POST(req: NextRequest) {
  await connectDB(); const user = getRequestUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const subscription = await req.json();
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 });
  await PushSubscription.findOneAndUpdate({ endpoint: subscription.endpoint }, { $set: { userId: user.userId, keys: subscription.keys } }, { upsert: true });
  return NextResponse.json({ message: 'Push notifications enabled' }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await connectDB(); const user = getRequestUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { endpoint } = await req.json(); await PushSubscription.deleteOne({ endpoint, userId: user.userId });
  return NextResponse.json({ message: 'Push notifications disabled' });
}

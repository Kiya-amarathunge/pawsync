/**
 * PawSync API route: /api/notifications/preferences
 *
 * Domain: notifications, preferences, and delivery.
 * Methods: GET, PUT.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getRequestUser } from '@/lib/request-auth';

const schema = z.object({ inApp: z.boolean(), email: z.boolean(), sms: z.boolean(), push: z.boolean(), appointmentReminders: z.boolean(), healthReminders: z.boolean(), messages: z.boolean(), reviews: z.boolean(), announcements: z.boolean() });

export async function GET(req: NextRequest) {
  await connectDB(); const user = getRequestUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const account = await User.findById(user.userId).select('notificationPreferences');
  return NextResponse.json({ preferences: account?.notificationPreferences });
}

export async function PUT(req: NextRequest) {
  await connectDB(); const user = getRequestUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  await User.findByIdAndUpdate(user.userId, { $set: { notificationPreferences: parsed.data } });
  return NextResponse.json({ message: 'Notification preferences updated', preferences: parsed.data });
}

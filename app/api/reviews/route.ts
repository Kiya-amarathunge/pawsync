/**
 * PawSync API route: /api/reviews
 *
 * Domain: verified reviews and moderation.
 * Methods: GET, POST.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Review from '@/models/Review';
import '@/models/User';
import Appointment from '@/models/Appointment';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { moderateText } from '@/lib/content-moderation';
import { createNotification } from '@/lib/notifications';

const reviewSchema = z.object({ appointmentId: z.string().min(1), rating: z.number().int().min(1).max(5), comment: z.string().trim().min(50).max(5000) });

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const providerId = req.nextUrl.searchParams.get('providerId');
    const flagged = req.nextUrl.searchParams.get('flagged') === 'true';
    const rating = Number(req.nextUrl.searchParams.get('rating')) || 0;
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
    const user = getRequestUser(req);
    if (flagged && user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const filter: Record<string, unknown> = {
      removedAt: { $exists: false },
      isFlagged: flagged,
    };
    if (providerId) filter.providerId = providerId;
    if (rating) filter.rating = rating;
    const limit = 20;
    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('ownerId', 'name').populate('providerId', 'name'),
      Review.countDocuments(filter),
    ]);
    return NextResponse.json({ reviews, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json({ error: 'Unable to load reviews' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Pet owner access required' }, { status: 403 });
    const parsed = reviewSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const moderation = moderateText(parsed.data.comment);
    if (!moderation.allowed) return NextResponse.json({ error: `Review requires revision: ${moderation.reasons.join(', ')}` }, { status: 422 });
    const appointment = await Appointment.findOne({ _id: parsed.data.appointmentId, ownerId: user.userId, status: 'completed' });
    if (!appointment) return NextResponse.json({ error: 'Only completed appointments can be reviewed' }, { status: 403 });
    if (await Review.exists({ appointmentId: appointment._id })) return NextResponse.json({ error: 'This appointment has already been reviewed' }, { status: 409 });
    const editDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const review = await Review.create({ ...parsed.data, providerId: appointment.providerId, ownerId: user.userId, editDeadline });
    await createNotification({ userId: appointment.providerId, type: 'NEW_REVIEW', message: `You received a new ${parsed.data.rating}-star review`, actionUrl: '/provider/reviews' });
    return NextResponse.json({ message: 'Review submitted successfully', review }, { status: 201 });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json({ error: 'Unable to submit review' }, { status: 500 });
  }
}

/**
 * PawSync API route: /api/reviews/[id]/flag
 *
 * Domain: verified reviews and moderation.
 * Methods: PATCH.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Review from '@/models/Review';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// PATCH /api/reviews/[id]/flag
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || !['veterinarian', 'service_provider'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    }

    const { id } = await params;
    const { reason } = await req.json().catch(() => ({ reason: 'Reported by user' }));
    const review = await Review.findOneAndUpdate(
      { _id: id, providerId: user.userId, removedAt: { $exists: false } },
      { $set: { isFlagged: true, moderationReason: String(reason || 'Reported by user').slice(0, 500) } },
      { new: true }
    );

    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    return NextResponse.json({ message: 'Review flagged for moderation' });
  } catch (error) {
    console.error('Flag review error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

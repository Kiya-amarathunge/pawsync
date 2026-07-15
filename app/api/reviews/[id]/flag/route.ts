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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { reason } = await req.json().catch(() => ({ reason: 'Reported by user' }));
    const review = await Review.findByIdAndUpdate(
      id,
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

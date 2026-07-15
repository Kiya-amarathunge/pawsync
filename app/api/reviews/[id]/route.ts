import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Review from '@/models/Review';
import { verifyToken } from '@/lib/jwt';
import { moderateText } from '@/lib/content-moderation';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// PUT /api/reviews/[id] — edit review within 48 hours
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const review = await Review.findOne({ _id: id, ownerId: user.userId });

    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    // Check edit deadline
    if (new Date() > new Date(review.editDeadline)) {
      return NextResponse.json(
        { error: 'Reviews can only be edited within 48 hours of posting' },
        { status: 403 }
      );
    }

    const { rating, comment } = await req.json();

    if (comment && comment.length < 50) {
      return NextResponse.json({ error: 'Review comment must be at least 50 characters' }, { status: 400 });
    }
    if (comment) {
      const moderation = moderateText(comment);
      if (!moderation.allowed) return NextResponse.json({ error: `Review requires revision: ${moderation.reasons.join(', ')}` }, { status: 422 });
    }

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    await review.save();

    return NextResponse.json({ message: 'Review updated successfully', review });
  } catch (error) {
    console.error('Update review error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * PawSync API route: /api/reviews/[id]/respond
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
import { moderateText } from '@/lib/content-moderation';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// PATCH /api/reviews/[id]/respond
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { response } = await req.json();
    if (!response) return NextResponse.json({ error: 'Response text is required' }, { status: 400 });
    const moderation = moderateText(response);
    if (!moderation.allowed) return NextResponse.json({ error: `Response requires revision: ${moderation.reasons.join(', ')}` }, { status: 422 });

    const review = await Review.findOneAndUpdate(
      { _id: id, providerId: user.userId },
      { $set: { providerResponse: response } },
      { new: true }
    );

    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    return NextResponse.json({ message: 'Response added successfully', review });
  } catch (error) {
    console.error('Respond to review error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

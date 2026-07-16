/**
 * PawSync API route: /api/forum/posts/[id]/report
 *
 * Domain: community discussions and participation.
 * Methods: POST.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// POST /api/forum/posts/[id]/report
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { reason } = await req.json();

    const post = await ForumPost.findByIdAndUpdate(
      id,
      { $set: { isFlagged: true, moderationReason: String(reason || 'Reported by user').slice(0, 500) } },
      { new: true }
    );

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    return NextResponse.json({ message: 'Post reported for moderation' });
  } catch (error) {
    console.error('Report post error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

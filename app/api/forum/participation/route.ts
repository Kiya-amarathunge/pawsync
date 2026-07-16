/**
 * PawSync API route: /api/forum/participation
 *
 * Domain: community discussions and participation.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';
import { getRequestUser } from '@/lib/request-auth';

export async function GET(req: NextRequest) {
  await connectDB(); const user = getRequestUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [posts, discussionsRepliedTo, helpfulVotes] = await Promise.all([
    ForumPost.countDocuments({ authorId: user.userId }), ForumPost.countDocuments({ 'replies.authorId': user.userId }),
    ForumPost.aggregate([{ $unwind: '$replies' }, { $match: { 'replies.authorId': user.userId } }, { $project: { count: { $size: '$replies.upvotes' } } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
  ]);
  return NextResponse.json({ posts, discussionsRepliedTo, helpfulVotes: helpfulVotes[0]?.total || 0 });
}

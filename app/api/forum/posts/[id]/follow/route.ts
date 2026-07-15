import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';
import { getRequestUser } from '@/lib/request-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB(); const user = getRequestUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params; const post = await ForumPost.findById(id); if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  const following = post.followers.some((item: { toString(): string }) => item.toString() === user.userId);
  await ForumPost.findByIdAndUpdate(id, following ? { $pull: { followers: user.userId } } : { $addToSet: { followers: user.userId } });
  return NextResponse.json({ message: following ? 'Topic unfollowed' : 'Topic followed', isFollowing: !following });
}

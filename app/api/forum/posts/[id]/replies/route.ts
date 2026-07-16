/**
 * PawSync API route: /api/forum/posts/[id]/replies
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
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';
import Veterinarian from '@/models/Veterinarian';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { moderateText } from '@/lib/content-moderation';
import { createNotification } from '@/lib/notifications';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB(); const user = getRequestUser(req); if (!hasRole(user, ['pet_owner', 'veterinarian'])) return NextResponse.json({ error: 'Forum access required' }, { status: 403 });
    const { content } = await req.json(); if (!content || String(content).trim().length < 2) return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    const moderation = moderateText(String(content)); if (!moderation.allowed) return NextResponse.json({ error: `Reply blocked: ${moderation.reasons.join(', ')}` }, { status: 422 });
    const { id } = await params; const post = await ForumPost.findById(id); if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    const verifiedVet = user.role === 'veterinarian' && Boolean(await Veterinarian.exists({ vetId: user.userId, isVerified: true }));
    const replyId = new mongoose.Types.ObjectId(); post.replies.push({ replyId, authorId: new mongoose.Types.ObjectId(user.userId), content: String(content).trim(), isVetVerified: verifiedVet, upvotes: [], images: [], createdAt: new Date() }); await post.save();
    if (String(post.authorId) !== user.userId) await createNotification({ userId: post.authorId, type: 'FORUM_REPLY', message: `Someone replied to “${post.title}”`, actionUrl: '/forum' });
    for (const follower of post.followers) if (String(follower) !== user.userId && String(follower) !== String(post.authorId)) await createNotification({ userId: follower, type: 'FORUM_REPLY', message: `New reply on “${post.title}”`, actionUrl: '/forum' });
    return NextResponse.json({ message: 'Reply added', replyId }, { status: 201 });
  } catch (error) { console.error('Add forum reply error:', error); return NextResponse.json({ error: 'Unable to add reply' }, { status: 500 }); }
}

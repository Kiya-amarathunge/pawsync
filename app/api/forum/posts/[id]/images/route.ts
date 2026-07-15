import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';
import { getRequestUser } from '@/lib/request-auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB(); const user = getRequestUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params; const form = await req.formData(); const file = form.get('file'); const replyId = String(form.get('replyId') || '');
    if (!(file instanceof File) || !['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image must be JPG or PNG and no larger than 5MB' }, { status: 400 });
    const post = await ForumPost.findById(id); if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (replyId) { const reply = post.replies.find((item: { replyId: { toString(): string } }) => item.replyId.toString() === replyId); if (!reply || reply.authorId.toString() !== user.userId) return NextResponse.json({ error: 'Reply not found or not owned by you' }, { status: 403 }); }
    else if (post.authorId.toString() !== user.userId) return NextResponse.json({ error: 'Only the post author can add images' }, { status: 403 });
    const filename = `${crypto.randomUUID()}${path.extname(file.name).toLowerCase()}`; const directory = path.join(process.cwd(), 'public', 'uploads', 'forum'); await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer())); const url = `/uploads/forum/${filename}`;
    if (replyId) await ForumPost.updateOne({ _id: id, 'replies.replyId': replyId }, { $push: { 'replies.$.images': url } }); else await ForumPost.findByIdAndUpdate(id, { $push: { images: url } });
    return NextResponse.json({ message: 'Image uploaded', url }, { status: 201 });
  } catch (error) { console.error('Forum image upload error:', error); return NextResponse.json({ error: 'Unable to upload image' }, { status: 500 }); }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';
import Review from '@/models/Review';
import AuditLog from '@/models/AuditLog';
import { getRequestUser } from '@/lib/request-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  await connectDB();
  const admin = getRequestUser(req);
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { type, id } = await params;
  if (type === 'post') await ForumPost.findByIdAndUpdate(id, { $set: { isFlagged: false, isModerated: true }, $unset: { moderationReason: 1 } });
  else if (type === 'review') await Review.findByIdAndUpdate(id, { $set: { isFlagged: false, isModerated: true }, $unset: { moderationReason: 1 } });
  else return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
  await AuditLog.create({ adminId: admin.userId, actionType: 'MODERATION_DISMISSED', affectedEntity: type, entityId: id, justification: 'Report reviewed and dismissed' });
  return NextResponse.json({ message: 'Report dismissed' });
}

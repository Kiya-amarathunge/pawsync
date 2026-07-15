import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import { getRequestUser } from '@/lib/request-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { conversationId } = await params;
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
    const limit = 30;
    const filter = { $or: [{ senderId: user.userId, receiverId: conversationId }, { senderId: conversationId, receiverId: user.userId }] };
    const [messages, otherUser] = await Promise.all([
      Message.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.findById(conversationId).select('name role').lean(),
    ]);
    const readAt = new Date();
    await Message.updateMany({ senderId: conversationId, receiverId: user.userId, isRead: false }, { $set: { isRead: true, readAt } });
    return NextResponse.json({ messages: messages.reverse(), otherUser, page });
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json({ error: 'Unable to load messages' }, { status: 500 });
  }
}

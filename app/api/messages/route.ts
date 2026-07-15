import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import { getRequestUser } from '@/lib/request-auth';
import { moderateText } from '@/lib/content-moderation';
import { createNotification } from '@/lib/notifications';

const messageSchema = z.object({ receiverId: z.string().min(1), content: z.string().trim().min(1).max(1000) });

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ids = await Message.aggregate([
      { $match: { $or: [{ senderId: user.userId }, { receiverId: user.userId }] } },
      { $project: { otherId: { $cond: [{ $eq: ['$senderId', { $toObjectId: user.userId }] }, '$receiverId', '$senderId'] } } },
      { $group: { _id: '$otherId' } },
    ]);
    const conversations = await Promise.all(ids.map(async ({ _id }) => {
      const [otherUser, lastMessage, unreadCount] = await Promise.all([
        User.findById(_id).select('name role').lean(),
        Message.findOne({ $or: [{ senderId: user.userId, receiverId: _id }, { senderId: _id, receiverId: user.userId }] }).sort({ createdAt: -1 }).lean(),
        Message.countDocuments({ senderId: _id, receiverId: user.userId, isRead: false }),
      ]);
      return { otherId: String(_id), otherUser, lastMessage, unreadCount };
    }));
    conversations.sort((a, b) => new Date(b.lastMessage?.createdAt || 0).getTime() - new Date(a.lastMessage?.createdAt || 0).getTime());
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ error: 'Unable to load conversations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = messageSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const receiver = await User.findOne({ _id: parsed.data.receiverId, isActive: true, isSuspended: false }).select('role');
    if (!receiver || receiver._id.toString() === user.userId) return NextResponse.json({ error: 'Recipient is unavailable' }, { status: 404 });
    const roles = new Set([user.role, receiver.role]);
    if (!roles.has('pet_owner') || (!roles.has('veterinarian') && !roles.has('service_provider'))) return NextResponse.json({ error: 'Messaging is limited to pet owner and provider conversations' }, { status: 403 });
    const moderation = moderateText(parsed.data.content);
    if (!moderation.allowed) return NextResponse.json({ error: `Message blocked: ${moderation.reasons.join(', ')}` }, { status: 422 });
    const message = await Message.create({ senderId: user.userId, receiverId: receiver._id, content: parsed.data.content });
    await createNotification({ userId: receiver._id, type: 'NEW_MESSAGE', message: 'You have a new message', relatedEntityId: message._id, actionUrl: `/messages?provider=${user.userId}` });
    return NextResponse.json({ message: 'Message sent', data: message }, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Unable to send message' }, { status: 500 });
  }
}

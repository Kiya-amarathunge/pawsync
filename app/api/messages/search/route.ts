/**
 * PawSync API route: /api/messages/search
 *
 * Domain: owner-provider messaging and attachments.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET /api/messages/search?q=...
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!mongoose.isValidObjectId(user.userId)) {
      return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
    }
    const userId = new mongoose.Types.ObjectId(user.userId);

    const q = req.nextUrl.searchParams.get('q')?.trim();
    if (!q) return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      content: { $regex: escapedQuery, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const otherIds = [...new Set(messages.map(message =>
      String(message.senderId) === String(userId) ? String(message.receiverId) : String(message.senderId)
    ))];
    const people = await User.find({ _id: { $in: otherIds } }).select('name').lean();
    const names = new Map(people.map(person => [String(person._id), person.name]));
    const results = messages.map(message => {
      const otherId = String(message.senderId) === String(userId)
        ? String(message.receiverId)
        : String(message.senderId);
      return {
        _id: String(message._id),
        otherId,
        otherName: names.get(otherId) || 'User',
        content: message.content,
        createdAt: message.createdAt,
      };
    });

    return NextResponse.json({ messages: results });
  } catch (error) {
    console.error('Search messages error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

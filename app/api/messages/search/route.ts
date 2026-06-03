import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
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

    const q = req.nextUrl.searchParams.get('q');
    if (!q) return NextResponse.json({ error: 'Search query is required' }, { status: 400 });

    const messages = await Message.find({
      $or: [{ senderId: user.userId }, { receiverId: user.userId }],
      content: { $regex: q, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('senderId', 'name')
      .populate('receiverId', 'name');

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Search messages error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

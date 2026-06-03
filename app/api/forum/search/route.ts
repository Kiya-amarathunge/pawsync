import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';

// GET /api/forum/search?q=...
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const q = req.nextUrl.searchParams.get('q');
    if (!q) return NextResponse.json({ error: 'Search query is required' }, { status: 400 });

    const posts = await ForumPost.find({
      isModerated: false,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('authorId', 'name role');

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Forum search error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

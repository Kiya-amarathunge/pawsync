import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET /api/forum/posts
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    const filter: any = { isModerated: false };
    if (category) filter.category = category;

    const posts = await ForumPost.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('authorId', 'name role');

    const total = await ForumPost.countDocuments(filter);

    return NextResponse.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get forum posts error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// POST /api/forum/posts
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { category, title, content, images } = await req.json();

    if (!category || !title || !content) {
      return NextResponse.json({ error: 'Category, title and content are required' }, { status: 400 });
    }

    const post = await ForumPost.create({
      authorId: user.userId,
      category,
      title,
      content,
      images: images || [],
    });

    return NextResponse.json({ message: 'Post created successfully', post }, { status: 201 });
  } catch (error) {
    console.error('Create forum post error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

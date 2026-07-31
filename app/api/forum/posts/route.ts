/**
 * PawSync API route: /api/forum/posts
 *
 * Domain: community discussions and participation.
 * Methods: GET, POST.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { moderateText } from '@/lib/content-moderation';

const schema = z.object({ category: z.enum(['health', 'nutrition', 'training', 'general']), title: z.string().trim().min(5).max(200), content: z.string().trim().min(10).max(10_000) });

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const category = req.nextUrl.searchParams.get('category'); const sort = req.nextUrl.searchParams.get('sort') || 'recent'; const flagged = req.nextUrl.searchParams.get('flagged') === 'true'; const query = req.nextUrl.searchParams.get('q')?.trim();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1); const limit = 20; const user = getRequestUser(req);
    const filter: Record<string, unknown> = flagged && user?.role === 'admin' ? { isFlagged: true, removedAt: { $exists: false } } : { isModerated: false, isFlagged: false, removedAt: { $exists: false } };
    if (category && category !== 'all') filter.category = category;
    if (query) {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escapedQuery, $options: 'i' } },
        { content: { $regex: escapedQuery, $options: 'i' } },
      ];
    }
    let posts = await ForumPost.find(filter).populate('authorId', 'name role').populate('replies.authorId', 'name role').lean();
    posts = posts.map(post => ({ ...post, isFollowing: user ? post.followers?.some((id: unknown) => String(id) === user.userId) : false, trendingScore: (post.upvotes?.length || 0) * 3 + (post.replies?.length || 0) * 2 + (post.views || 0) * 0.1 }));
    posts.sort(sort === 'trending' ? (a, b) => b.trendingScore - a.trendingScore : (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const start = (page - 1) * limit;
    return NextResponse.json({ posts: posts.slice(start, start + limit), total: posts.length, page, pages: Math.ceil(posts.length / limit) });
  } catch (error) { console.error('Get forum posts error:', error); return NextResponse.json({ error: 'Unable to load forum posts' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB(); const user = getRequestUser(req); if (!hasRole(user, ['pet_owner', 'veterinarian'])) return NextResponse.json({ error: 'Forum access required' }, { status: 403 });
    const parsed = schema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const moderation = moderateText(`${parsed.data.title} ${parsed.data.content}`); if (!moderation.allowed) return NextResponse.json({ error: `Post blocked: ${moderation.reasons.join(', ')}` }, { status: 422 });
    const post = await ForumPost.create({ authorId: user.userId, ...parsed.data }); return NextResponse.json({ message: 'Post created', post }, { status: 201 });
  } catch (error) { console.error('Create forum post error:', error); return NextResponse.json({ error: 'Unable to create post' }, { status: 500 }); }
}

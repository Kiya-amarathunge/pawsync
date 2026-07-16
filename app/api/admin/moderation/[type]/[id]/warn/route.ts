/**
 * PawSync API route: /api/admin/moderation/[type]/[id]/warn
 *
 * Domain: administration, moderation, reporting, and platform oversight.
 * Methods: PATCH.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';
import Review from '@/models/Review';
import AuditLog from '@/models/AuditLog';
import { verifyToken } from '@/lib/jwt';
import { createNotification } from '@/lib/notifications';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// PATCH /api/admin/moderation/[type]/[id]/warn
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    await connectDB();

    const { type, id } = await params;

    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reason, notifyUser } = await req.json();

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    // Apply warning based on type
    let targetUserId: string | null = null;

    if (type === 'post') {
      const post = await ForumPost.findById(id);
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      targetUserId = String(post.authorId);

      await ForumPost.findByIdAndUpdate(id, {
        $inc: { warningCount: 1 },
      });
    } else if (type === 'review') {
      const review = await Review.findById(id);
      if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 });
      }
      targetUserId = String(review.ownerId);

      await Review.findByIdAndUpdate(id, {
        $inc: { warningCount: 1 },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    // Optional notification
    if (notifyUser && targetUserId) {
      await createNotification({
        userId: targetUserId,
        type: 'WARNING',
        message: `You received a warning: ${reason}`,
        actionUrl: '/notifications',
      });
    }

    // Audit log
    await AuditLog.create({
      adminId: admin.userId,
      actionType: 'CONTENT_WARNED',
      affectedEntity: type,
      entityId: id,
      justification: reason,
    });

    return NextResponse.json({
      message: 'Warning issued successfully',
    });
  } catch (error) {
    console.error('Warn content error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

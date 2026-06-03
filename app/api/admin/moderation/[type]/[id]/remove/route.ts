import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ForumPost from '@/models/ForumPost';
import Review from '@/models/Review';
import AuditLog from '@/models/AuditLog';
import { verifyToken } from '@/lib/jwt';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded || decoded.role !== 'admin') {
    return null;
  }

  return decoded;
}

// PATCH /api/admin/moderation/[type]/[id]/remove
export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ type: string; id: string }>;
  }
) {
  try {
    await connectDB();

    const admin = getAdminFromRequest(req);

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { type, id } = await params;

    const { justification } = await req.json();

    if (type === 'post') {
      await ForumPost.findByIdAndUpdate(id, {
        $set: { isModerated: true },
      });
    } else if (type === 'review') {
      await Review.findByIdAndUpdate(id, {
        $set: { isModerated: true },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    await AuditLog.create({
      adminId: admin.userId,
      actionType: 'CONTENT_REMOVED',
      affectedEntity: type,
      entityId: id,
      justification:
        justification || 'Content violated community guidelines',
    });

    return NextResponse.json({
      message: 'Content removed successfully',
    });
  } catch (error) {
    console.error('Remove content error:', error);

    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
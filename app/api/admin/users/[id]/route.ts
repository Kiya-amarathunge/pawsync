/**
 * PawSync API route: /api/admin/users/[id]
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
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { verifyToken } from '@/lib/jwt';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, justification } = body;

    if (!['suspend', 'activate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'suspend') {
      user.isSuspended = true;
    } else {
      user.isSuspended = false;
      user.isActive = true;
    }

    await user.save();

    await AuditLog.create({
      adminId: admin.userId,
      actionType: action === 'suspend' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      affectedEntity: 'User',
      entityId: user._id,
      justification: justification || 'No reason provided',
    });

    return NextResponse.json({
      message: `User ${action === 'suspend' ? 'suspended' : 'activated'} successfully`,
    });
  } catch (error) {
    console.error('Admin suspend/activate error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
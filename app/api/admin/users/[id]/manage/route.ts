/**
 * PawSync API route: /api/admin/users/[id]/manage
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
import Pet from '@/models/Pet';
import Appointment from '@/models/Appointment';
import Message from '@/models/Message';
import AuditLog from '@/models/AuditLog';
import { verifyToken, signAccessToken } from '@/lib/jwt';
import { sendPasswordResetEmail } from '@/lib/mailer';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// PATCH /api/admin/users/[id]/manage
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, mergeWithUserId, justification } = await req.json();

    if (!action) return NextResponse.json({ error: 'Action is required' }, { status: 400 });

    const { id } = await params;
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let resultMessage = '';

    // Action 1 — Force password reset email
    if (action === 'reset-password') {
      const token = signAccessToken({ userId: user._id, purpose: 'reset-password' });
      await sendPasswordResetEmail(user.email, token);
      resultMessage = 'Password reset email sent successfully';
    }

    // Action 2 — Unlock suspended account
    else if (action === 'unlock') {
      user.isSuspended = false;
      user.isActive = true;
      await user.save();
      resultMessage = 'Account unlocked successfully';
    }

    // Action 3 — Merge duplicate account into this one
    else if (action === 'merge' && mergeWithUserId) {
      const duplicateUser = await User.findById(mergeWithUserId);
      if (!duplicateUser) {
        return NextResponse.json({ error: 'Duplicate user not found' }, { status: 404 });
      }

      // Transfer pets
      await Pet.updateMany(
        { ownerId: mergeWithUserId },
        { $set: { ownerId: id } }
      );

      // Transfer appointments
      await Appointment.updateMany(
        { ownerId: mergeWithUserId },
        { $set: { ownerId: id } }
      );

      // Transfer messages
      await Message.updateMany(
        { senderId: mergeWithUserId },
        { $set: { senderId: id } }
      );
      await Message.updateMany(
        { receiverId: mergeWithUserId },
        { $set: { receiverId: id } }
      );

      // Deactivate the duplicate account
      duplicateUser.isActive = false;
      duplicateUser.isSuspended = true;
      await duplicateUser.save();

      resultMessage = `Accounts merged successfully. Data from ${duplicateUser.email} transferred to ${user.email}`;
    }

    else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Log the action
    await AuditLog.create({
      adminId: admin.userId,
      actionType: `ACCOUNT_${action.toUpperCase()}`,
      affectedEntity: 'User',
      entityId: user._id,
      justification: justification || resultMessage,
    });

    return NextResponse.json({ message: resultMessage });
  } catch (error) {
    console.error('Admin account manage error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
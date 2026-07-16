/**
 * PawSync API route: /api/admin/disputes/[id]/resolve
 *
 * Domain: administration, moderation, reporting, and platform oversight.
 * Methods: POST.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import Dispute from '@/models/Dispute';
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const { resolution, notifyOwner, notifyProvider, action, refundAmount } =
      await req.json();

    if (!resolution) {
      return NextResponse.json(
        { error: 'Resolution is required' },
        { status: 400 }
      );
    }

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }
    if (['resolved', 'dismissed'].includes(dispute.status)) {
      return NextResponse.json({ error: 'This dispute has already been closed' }, { status: 409 });
    }
    const appointment = await Appointment.findById(dispute.appointmentId);
    if (!appointment) return NextResponse.json({ error: 'Related appointment not found' }, { status: 404 });

    if (action === 'cancel') appointment.status = 'cancelled';
    if (action === 'refund') {
      appointment.refundStatus = 'approved';
      appointment.refundAmount = Math.min(Math.max(Number(refundAmount) || appointment.price || 0, 0), appointment.price || Number(refundAmount) || 0);
    }
    await appointment.save();
    dispute.status = action === 'dismiss' ? 'dismissed' : 'resolved';
    dispute.resolution = resolution;
    dispute.resolutionAction = action === 'dismiss' ? 'dismiss' : action || 'mediate';
    dispute.refundAmount = action === 'refund' ? appointment.refundAmount : undefined;
    dispute.resolvedBy = new mongoose.Types.ObjectId(admin.userId);
    dispute.resolvedAt = new Date();
    await dispute.save();

    if (notifyOwner) {
      await createNotification({
        userId: appointment.ownerId,
        type: 'DISPUTE_RESOLVED',
        message: `Your dispute has been resolved: ${resolution}`,
        actionUrl: '/disputes',
      });
    }

    if (notifyProvider) {
      await createNotification({
        userId: appointment.providerId,
        type: 'DISPUTE_RESOLVED',
        message: `A dispute has been resolved: ${resolution}`,
        actionUrl: '/disputes',
      });
    }

    await AuditLog.create({
      adminId: admin.userId,
      actionType: 'DISPUTE_RESOLVED',
      affectedEntity: 'Dispute',
      entityId: dispute._id,
      justification: `${resolution}; action=${action || 'mediate'}${action === 'refund' ? `; refund=${appointment.refundAmount}` : ''}`,
    });

    return NextResponse.json({
      message: 'Dispute resolved successfully',
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);

    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

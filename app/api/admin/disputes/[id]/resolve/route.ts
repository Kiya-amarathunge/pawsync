import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import Notification from '@/models/Notification';
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

    const { resolution, notifyOwner, notifyProvider } =
      await req.json();

    if (!resolution) {
      return NextResponse.json(
        { error: 'Resolution is required' },
        { status: 400 }
      );
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    if (notifyOwner) {
      await Notification.create({
        userId: appointment.ownerId,
        type: 'DISPUTE_RESOLVED',
        message: `Your dispute has been resolved: ${resolution}`,
        isRead: false,
      });
    }

    if (notifyProvider) {
      await Notification.create({
        userId: appointment.providerId,
        type: 'DISPUTE_RESOLVED',
        message: `A dispute has been resolved: ${resolution}`,
        isRead: false,
      });
    }

    await AuditLog.create({
      adminId: admin.userId,
      actionType: 'DISPUTE_RESOLVED',
      affectedEntity: 'Appointment',
      entityId: appointment._id,
      justification: resolution,
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
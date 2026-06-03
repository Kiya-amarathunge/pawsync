import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import Notification from '@/models/Notification';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// PATCH /api/appointments/[id]/status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { status, newDateTime } = await req.json();

    const validStatuses = ['confirmed', 'completed', 'cancelled', 'rescheduled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { id } = await params;
    const appointment = await Appointment.findOne({
      _id: id,
      providerId: user.userId,
    });

    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    appointment.status = status;
    if (status === 'rescheduled' && newDateTime) {
      appointment.dateTime = new Date(newDateTime);
    }
    await appointment.save();

    // Notify the owner
    await Notification.create({
      userId: appointment.ownerId,
      type: 'APPOINTMENT_UPDATE',
      message: `Your appointment on ${new Date(appointment.dateTime).toDateString()} has been ${status}`,
      isRead: false,
    });

    return NextResponse.json({ message: `Appointment ${status} successfully`, appointment });
  } catch (error) {
    console.error('Update appointment status error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
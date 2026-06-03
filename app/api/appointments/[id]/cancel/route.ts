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

// PATCH /api/appointments/[id]/cancel
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const appointment = await Appointment.findOne({
      _id: id,
      ownerId: user.userId,
    });

    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    // Check 24 hour cancellation policy
    const hoursUntilAppointment =
      (new Date(appointment.dateTime).getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 24) {
      return NextResponse.json(
        { error: 'Appointments must be cancelled at least 24 hours in advance' },
        { status: 400 }
      );
    }

    appointment.status = 'cancelled';
    await appointment.save();

    // Notify the provider
    await Notification.create({
      userId: appointment.providerId,
      type: 'APPOINTMENT_CANCELLED',
      message: `An appointment on ${new Date(appointment.dateTime).toDateString()} has been cancelled by the owner`,
      isRead: false,
    });

    return NextResponse.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
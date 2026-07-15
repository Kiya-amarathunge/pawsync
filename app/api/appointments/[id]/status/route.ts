import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { intervalsOverlap } from '@/lib/appointments';
import { createNotification } from '@/lib/notifications';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['veterinarian', 'service_provider'])) return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    const { status, newDateTime } = await req.json();
    if (!['confirmed', 'completed', 'cancelled', 'rescheduled'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    const { id } = await params;
    const appointment = await Appointment.findOne({ _id: id, providerId: user.userId });
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    if (status === 'rescheduled') {
      if (!newDateTime) return NextResponse.json({ error: 'A proposed date and time is required' }, { status: 400 });
      const proposed = new Date(newDateTime);
      const proposedEnd = new Date(proposed.getTime() + appointment.duration * 60_000);
      const conflicts = await Appointment.find({ _id: { $ne: appointment._id }, providerId: user.userId, dateTime: { $lt: proposedEnd }, status: { $in: ['pending', 'confirmed'] } });
      if (conflicts.some(item => intervalsOverlap(proposed, appointment.duration, item))) return NextResponse.json({ error: 'Proposed time overlaps another appointment' }, { status: 409 });
      appointment.rescheduleHistory.push({ previousDateTime: appointment.dateTime, newDateTime: proposed, requestedBy: user.userId, changedAt: new Date() });
      appointment.dateTime = proposed;
      appointment.reminder24hSent = false;
      appointment.reminder2hSent = false;
    }
    appointment.status = status;
    appointment.statusUpdatedAt = new Date();
    await appointment.save();
    await createNotification({
      userId: appointment.ownerId,
      type: status === 'confirmed' ? 'APPOINTMENT_CONFIRMED' : 'APPOINTMENT_UPDATE',
      message: `Your appointment for ${appointment.dateTime.toLocaleString()} has been ${status}`,
      actionUrl: '/appointments',
    });
    return NextResponse.json({ message: `Appointment ${status} successfully`, appointment });
  } catch (error) {
    console.error('Update appointment status error:', error);
    return NextResponse.json({ error: 'Unable to update appointment' }, { status: 500 });
  }
}

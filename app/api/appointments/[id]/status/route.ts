/**
 * PawSync API route: /api/appointments/[id]/status
 *
 * Domain: appointment booking, scheduling, and status management.
 * Methods: PATCH.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import ServiceProvider from '@/models/ServiceProvider';
import Veterinarian from '@/models/Veterinarian';
import { getRequestUser } from '@/lib/request-auth';
import { hasAppointmentTimePassed, intervalsOverlap, isWithinAvailability } from '@/lib/appointments';
import { createNotification } from '@/lib/notifications';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { status, newDateTime } = await req.json();
    if (!['confirmed', 'completed', 'cancelled', 'rescheduled'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    const { id } = await params;
    const isProvider = user.role === 'veterinarian' || user.role === 'service_provider';
    const appointment = await Appointment.findOne(
      isProvider ? { _id: id, providerId: user.userId } : { _id: id, ownerId: user.userId },
    );
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    if (!isProvider) {
      const latestReschedule = appointment.rescheduleHistory.at(-1);
      const providerProposed = latestReschedule
        && String(latestReschedule.requestedBy) === String(appointment.providerId);
      if (user.role !== 'pet_owner' || status !== 'confirmed' || appointment.status !== 'rescheduled' || !providerProposed) {
        return NextResponse.json({ error: 'This reschedule proposal cannot be accepted' }, { status: 409 });
      }
      appointment.status = 'confirmed';
      appointment.statusUpdatedAt = new Date();
      await appointment.save();
      await createNotification({
        userId: appointment.providerId,
        type: 'APPOINTMENT_CONFIRMED',
        message: `The pet owner accepted the new appointment time: ${appointment.dateTime.toLocaleString()}`,
        actionUrl: '/provider/appointments',
      });
      return NextResponse.json({ message: 'New appointment time accepted', appointment });
    }

    const allowedTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled', 'rescheduled'],
      confirmed: ['completed', 'cancelled', 'rescheduled'],
    };
    if (!allowedTransitions[appointment.status]?.includes(status)) {
      return NextResponse.json({ error: `A ${appointment.status} appointment cannot be changed to ${status}` }, { status: 409 });
    }
    if (status === 'completed' && !hasAppointmentTimePassed(appointment.dateTime)) {
      return NextResponse.json(
        { error: 'This appointment can only be marked complete after its scheduled date and time' },
        { status: 409 },
      );
    }
    if (status === 'rescheduled') {
      if (!newDateTime) return NextResponse.json({ error: 'A proposed date and time is required' }, { status: 400 });
      const proposed = new Date(newDateTime);
      if (Number.isNaN(proposed.getTime()) || proposed.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'The proposed appointment time must be in the future' }, { status: 400 });
      }
      const provider = user.role === 'veterinarian'
        ? await Veterinarian.findOne({ vetId: user.userId })
        : await ServiceProvider.findOne({ providerId: user.userId });
      if (!provider) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
      const hours = provider.availability.find(
        (slot: { dayOfWeek: number }) => slot.dayOfWeek === proposed.getDay(),
      );
      const blocked = provider.blockedDates.some(
        (date: Date) => date.toDateString() === proposed.toDateString(),
      );
      if (!hours || blocked || !isWithinAvailability(proposed, appointment.duration, hours)) {
        return NextResponse.json({ error: 'The proposed time is outside your available working hours' }, { status: 409 });
      }
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

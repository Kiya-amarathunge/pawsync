import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import ServiceProvider from '@/models/ServiceProvider';
import Veterinarian from '@/models/Veterinarian';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { intervalsOverlap, isWithinAvailability } from '@/lib/appointments';
import { createNotification } from '@/lib/notifications';

const schema = z.object({ dateTime: z.string().datetime() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'A valid new date and time is required' }, { status: 400 });
    const appointment = await Appointment.findOne({ _id: id, ownerId: user.userId, status: { $in: ['pending', 'confirmed'] } });
    if (!appointment) return NextResponse.json({ error: 'Appointment cannot be rescheduled' }, { status: 404 });
    const newStart = new Date(parsed.data.dateTime);
    if (newStart.getTime() < Date.now() + 24 * 60 * 60 * 1000) return NextResponse.json({ error: 'Rescheduling requires at least 24 hours notice' }, { status: 400 });
    const provider = await ServiceProvider.findOne({ providerId: appointment.providerId }) || await Veterinarian.findOne({ vetId: appointment.providerId });
    if (!provider) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    const hours = provider.availability.find((slot: { dayOfWeek: number }) => slot.dayOfWeek === newStart.getDay());
    const blocked = provider.blockedDates.some((date: Date) => date.toDateString() === newStart.toDateString());
    if (!hours || blocked) return NextResponse.json({ error: 'Provider is unavailable on that date' }, { status: 409 });
    if (!isWithinAvailability(newStart, appointment.duration, hours)) return NextResponse.json({ error: 'Selected time is outside provider working hours' }, { status: 409 });
    const newEnd = new Date(newStart.getTime() + appointment.duration * 60_000);
    const conflicts = await Appointment.find({ _id: { $ne: appointment._id }, providerId: appointment.providerId, dateTime: { $lt: newEnd }, status: { $in: ['pending', 'confirmed'] } });
    if (conflicts.some(item => intervalsOverlap(newStart, appointment.duration, item))) return NextResponse.json({ error: 'Selected time overlaps another appointment' }, { status: 409 });
    appointment.rescheduleHistory.push({ previousDateTime: appointment.dateTime, newDateTime: newStart, requestedBy: user.userId, changedAt: new Date() });
    appointment.dateTime = newStart; appointment.status = 'pending'; appointment.reminder24hSent = false; appointment.reminder2hSent = false; await appointment.save();
    await createNotification({ userId: appointment.providerId, type: 'APPOINTMENT_RESCHEDULED', message: `Appointment rescheduled to ${newStart.toLocaleString()} and requires confirmation`, actionUrl: '/provider/appointments' });
    return NextResponse.json({ message: 'Appointment rescheduled and sent for provider confirmation', appointment });
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    return NextResponse.json({ error: 'Unable to reschedule appointment' }, { status: 500 });
  }
}

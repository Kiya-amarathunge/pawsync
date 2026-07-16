/**
 * PawSync API route: /api/providers/[id]/availability
 *
 * Domain: provider discovery and availability.
 * Methods: GET, PUT.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import ServiceProvider from '@/models/ServiceProvider';
import Veterinarian from '@/models/Veterinarian';
import Appointment from '@/models/Appointment';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { intervalsOverlap } from '@/lib/appointments';

const availabilitySchema = z.object({
  availability: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/) })),
  blockedDates: z.array(z.string().date()).default([]),
});

async function findProfile(id: string) {
  return await ServiceProvider.findOne({ providerId: id }) || await Veterinarian.findOne({ vetId: id });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const dateValue = req.nextUrl.searchParams.get('date');
    if (req.nextUrl.searchParams.get('manage') === '1') {
      const user = getRequestUser(req);
      if (!hasRole(user, ['veterinarian', 'service_provider']) || user.userId !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const profile = await findProfile(id);
      if (!profile) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      return NextResponse.json({ availability: profile.availability, blockedDates: profile.blockedDates });
    }
    if (!dateValue) return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    const profile = await findProfile(id);
    if (!profile) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    if (profile.blockedDates.some((blocked: Date) => blocked.toDateString() === date.toDateString())) {
      return NextResponse.json({ availableSlots: [], date: dateValue, blocked: true });
    }
    const hours = profile.availability.find((slot: { dayOfWeek: number }) => slot.dayOfWeek === date.getDay());
    if (!hours) return NextResponse.json({ availableSlots: [], date: dateValue });
    const [startHour, startMinute] = hours.startTime.split(':').map(Number);
    const [endHour, endMinute] = hours.endTime.split(':').map(Number);
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
    const appointments = await Appointment.find({ providerId: id, dateTime: { $gte: dayStart, $lte: dayEnd }, status: { $in: ['pending', 'confirmed'] } });
    const duration = Number(req.nextUrl.searchParams.get('duration')) || 60;
    const slots: Array<{ time: string; label: string }> = [];
    for (let minute = startHour * 60 + startMinute; minute + duration <= endHour * 60 + endMinute; minute += 30) {
      const candidate = new Date(date); candidate.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      const overlaps = appointments.some(appointment => intervalsOverlap(candidate, duration, appointment));
      if (!overlaps && candidate.getTime() > Date.now()) slots.push({ time: `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`, label: candidate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) });
    }
    return NextResponse.json({ availableSlots: slots, date: dateValue });
  } catch (error) {
    console.error('Get availability error:', error);
    return NextResponse.json({ error: 'Unable to load availability' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!hasRole(user, ['veterinarian', 'service_provider']) || user.userId !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const parsed = availabilitySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const update = { availability: parsed.data.availability, blockedDates: parsed.data.blockedDates.map(date => new Date(`${date}T00:00:00`)) };
    const provider = user.role === 'veterinarian'
      ? await Veterinarian.findOneAndUpdate({ vetId: user.userId }, { $set: update }, { new: true })
      : await ServiceProvider.findOneAndUpdate({ providerId: user.userId }, { $set: update }, { new: true });
    if (!provider) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    return NextResponse.json({ message: 'Availability updated successfully', provider });
  } catch (error) {
    console.error('Update availability error:', error);
    return NextResponse.json({ error: 'Unable to update availability' }, { status: 500 });
  }
}

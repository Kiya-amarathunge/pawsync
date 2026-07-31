/**
 * PawSync API route: /api/appointments
 *
 * Domain: appointment booking, scheduling, and status management.
 * Methods: GET, POST.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import Pet from '@/models/Pet';
import ServiceProvider from '@/models/ServiceProvider';
import Veterinarian from '@/models/Veterinarian';
import User from '@/models/User';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { intervalsOverlap, isWithinAvailability } from '@/lib/appointments';
import { createNotification } from '@/lib/notifications';

const bookingSchema = z.object({
  petId: z.string().min(1), providerId: z.string().min(1),
  serviceType: z.enum(['veterinary', 'grooming', 'training', 'boarding', 'sitting']),
  dateTime: z.string().datetime(), duration: z.number().int().min(15).max(480).optional(),
  notes: z.string().trim().max(2000).optional().default(''),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const status = req.nextUrl.searchParams.get('status');
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
    const limit = 20;
    const filter: Record<string, unknown> = user.role === 'pet_owner' ? { ownerId: user.userId } : { providerId: user.userId };
    if (status) filter.status = status;
    const appointments = await Appointment.find(filter).sort({ dateTime: 1 }).skip((page - 1) * limit).limit(limit)
      .populate('petId', 'name species').populate('ownerId', 'name email').populate('providerId', 'name email');
    const total = await Appointment.countDocuments(filter);
    return NextResponse.json({ appointments, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get appointments error:', error);
    return NextResponse.json({ error: 'Unable to load appointments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Pet owner access required' }, { status: 403 });
    const parsed = bookingSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const data = parsed.data;
    const [pet, providerUser, serviceProvider, veterinarian] = await Promise.all([
      Pet.findOne({ _id: data.petId, ownerId: user.userId }),
      User.findOne({
        _id: data.providerId,
        role: { $in: ['veterinarian', 'service_provider'] },
        isActive: true,
        isSuspended: false,
        verificationStatus: 'approved',
      }),
      ServiceProvider.findOne({ providerId: data.providerId }),
      Veterinarian.findOne({ vetId: data.providerId }),
    ]);
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    const provider = serviceProvider || veterinarian;
    if (!providerUser || !provider) return NextResponse.json({ error: 'Verified provider not found' }, { status: 404 });
    const serviceTypes = serviceProvider?.serviceType || ['veterinary'];
    if (!serviceTypes.includes(data.serviceType)) return NextResponse.json({ error: 'Provider does not offer this service' }, { status: 400 });
    const pricing = provider.pricing?.find((item: { service: string }) => item.service === data.serviceType);
    const duration = pricing?.duration || data.duration || 60;
    const start = new Date(data.dateTime);
    if (start.getTime() <= Date.now()) return NextResponse.json({ error: 'Appointment must be in the future' }, { status: 400 });
    const availability = provider.availability.find((slot: { dayOfWeek: number }) => slot.dayOfWeek === start.getDay());
    const blocked = provider.blockedDates.some((date: Date) => date.toDateString() === start.toDateString());
    if (!availability || blocked) return NextResponse.json({ error: 'Provider is not available on this date' }, { status: 409 });
    if (!isWithinAvailability(start, duration, availability)) {
      return NextResponse.json({ error: 'Selected time is outside provider working hours' }, { status: 409 });
    }
    const candidateEnd = new Date(start.getTime() + duration * 60_000);
    const possibleOverlaps = await Appointment.find({
      providerId: data.providerId,
      dateTime: { $lt: candidateEnd },
      status: { $in: ['pending', 'confirmed'] },
    });
    if (possibleOverlaps.some(appointment => intervalsOverlap(start, duration, appointment))) {
      return NextResponse.json({ error: 'This time overlaps another appointment' }, { status: 409 });
    }
    const appointment = await Appointment.create({
      ...data, dateTime: start, duration, price: pricing?.price || 0,
      ownerId: user.userId, status: 'pending',
    });
    await Promise.all([
      createNotification({ userId: data.providerId, type: 'NEW_BOOKING', message: `New ${data.serviceType} booking request for ${start.toLocaleString()}`, actionUrl: '/provider/appointments' }),
      createNotification({ userId: user.userId, type: 'BOOKING_CONFIRMATION', message: `Your ${data.serviceType} appointment was requested for ${start.toLocaleString()}`, actionUrl: '/appointments' }),
    ]);
    return NextResponse.json({ message: 'Appointment booked successfully', appointment }, { status: 201 });
  } catch (error) {
    console.error('Create appointment error:', error);
    return NextResponse.json({ error: 'Unable to create appointment' }, { status: 500 });
  }
}

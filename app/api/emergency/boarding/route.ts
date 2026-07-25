/**
 * PawSync API route: /api/emergency/boarding
 *
 * Domain: emergency service discovery and urgent assistance.
 * Methods: GET, POST.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import ServiceProvider from '@/models/ServiceProvider';
import User from '@/models/User';
import Appointment from '@/models/Appointment';
import EmergencyEvent from '@/models/EmergencyEvent';
import Pet from '@/models/Pet';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { createNotification } from '@/lib/notifications';

const boardingRequestSchema = z.object({
  providerId: z.string().min(1),
  petId: z.string().min(1),
  dateTime: z.string().datetime(),
  notes: z.string().trim().min(3).max(2000),
});

// GET /api/emergency/boarding
export async function GET() {
  try {
    await connectDB();

    const boardingProviders = await ServiceProvider.find({
      serviceType: { $in: ['boarding'] },
    })
      .limit(10)
      .populate({
        path: 'providerId',
        match: { isActive: true, isSuspended: false, verificationStatus: 'approved' },
        select: 'name phoneNumber',
      })
      .lean();

    return NextResponse.json({ boarding: boardingProviders.filter(provider => provider.providerId) });
  } catch (error) {
    console.error('Get emergency boarding error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Pet owner access required' }, { status: 403 });
    const parsed = boardingRequestSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const { providerId, petId, dateTime, notes } = parsed.data;
    const requestedTime = new Date(dateTime);
    if (requestedTime.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Emergency boarding time must be in the future' }, { status: 400 });
    }
    const [providerUser, provider, pet] = await Promise.all([
      User.findOne({ _id: providerId, role: 'service_provider', isActive: true, isSuspended: false, verificationStatus: 'approved' }),
      ServiceProvider.findOne({ providerId, serviceType: 'boarding' }),
      Pet.findOne({ _id: petId, ownerId: user.userId }),
    ]);
    if (!providerUser || !provider || !pet) return NextResponse.json({ error: 'Approved boarding provider or pet not found' }, { status: 404 });
    const pricing = provider.pricing.find((item: { service: string }) => item.service === 'boarding');
    const appointment = await Appointment.create({ providerId, petId, ownerId: user.userId, serviceType: 'boarding', dateTime: requestedTime, duration: pricing?.duration || 60, price: pricing?.price || 0, notes, status: 'pending', isEmergency: true });
    await EmergencyEvent.create({ ownerId: user.userId, petId, eventType: 'boarding_request', reason: notes });
    await createNotification({ userId: providerId, type: 'EMERGENCY_BOARDING', message: `Urgent boarding request received for ${pet.name}`, actionUrl: '/provider/appointments', force: true });
    return NextResponse.json({ message: 'Emergency boarding request sent', appointment }, { status: 201 });
  } catch (error) {
    console.error('Emergency boarding request error:', error);
    return NextResponse.json({ error: 'Unable to request emergency boarding' }, { status: 500 });
  }
}

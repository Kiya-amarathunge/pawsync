/**
 * PawSync API route: /api/disputes
 *
 * Domain: user dispute submission and case tracking.
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
import Dispute from '@/models/Dispute';
import '@/models/Pet';
import '@/models/User';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { createNotification } from '@/lib/notifications';

const createSchema = z.object({
  appointmentId: z.string().min(1),
  category: z.enum(['service_quality', 'cancellation', 'billing', 'refund', 'conduct', 'other']),
  subject: z.string().trim().min(5).max(150),
  description: z.string().trim().min(20).max(5000),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian', 'service_provider'])) {
      return NextResponse.json({ error: 'User access required' }, { status: 403 });
    }
    const filter = user.role === 'pet_owner'
      ? { ownerId: user.userId }
      : { providerId: user.userId };
    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .populate('appointmentId', 'serviceType dateTime status price')
      .populate('ownerId', 'name email')
      .populate('providerId', 'name email')
      .populate('openedBy', 'name role')
      .lean();
    return NextResponse.json({ disputes });
  } catch (error) {
    console.error('Get user disputes error:', error);
    return NextResponse.json({ error: 'Unable to load disputes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian', 'service_provider'])) {
      return NextResponse.json({ error: 'User access required' }, { status: 403 });
    }
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const appointment = await Appointment.findOne(
      user.role === 'pet_owner'
        ? { _id: parsed.data.appointmentId, ownerId: user.userId }
        : { _id: parsed.data.appointmentId, providerId: user.userId },
    );
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    if (!['confirmed', 'completed', 'cancelled', 'rescheduled'].includes(appointment.status)) {
      return NextResponse.json({ error: 'A dispute cannot be opened for a pending appointment' }, { status: 409 });
    }
    const existing = await Dispute.exists({
      appointmentId: appointment._id,
      openedBy: user.userId,
      status: { $in: ['open', 'under_review'] },
    });
    if (existing) return NextResponse.json({ error: 'You already have an active dispute for this appointment' }, { status: 409 });

    const dispute = await Dispute.create({
      ...parsed.data,
      openedBy: user.userId,
      ownerId: appointment.ownerId,
      providerId: appointment.providerId,
    });
    const otherUserId = user.role === 'pet_owner' ? appointment.providerId : appointment.ownerId;
    await createNotification({
      userId: otherUserId,
      type: 'APPOINTMENT_UPDATE',
      message: `A dispute was opened for the ${appointment.serviceType} appointment`,
      actionUrl: '/disputes',
    });
    return NextResponse.json({ message: 'Dispute submitted for administrator review', dispute }, { status: 201 });
  } catch (error) {
    console.error('Create dispute error:', error);
    return NextResponse.json({ error: 'Unable to create dispute' }, { status: 500 });
  }
}

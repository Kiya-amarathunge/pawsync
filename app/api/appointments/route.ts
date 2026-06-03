import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import Notification from '@/models/Notification';
import { verifyToken } from '@/lib/jwt';
import '@/models/Pet';
import '@/models/User';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET /api/appointments
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    const filter: any =
      user.role === 'pet_owner'
        ? { ownerId: user.userId }
        : { providerId: user.userId };

    if (status) filter.status = status;

    const appointments = await Appointment.find(filter)
      .sort({ dateTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('petId', 'name species')
      .populate('ownerId', 'name email')
      .populate('providerId', 'name email');

    const total = await Appointment.countDocuments(filter);

    return NextResponse.json({ appointments, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get appointments error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// POST /api/appointments
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { petId, providerId, serviceType, dateTime, duration, notes, price } = body;

    if (!petId || !providerId || !serviceType || !dateTime) {
      return NextResponse.json({ error: 'Pet, provider, service type, and date are required' }, { status: 400 });
    }

    // Check for double booking
    const existingAppointment = await Appointment.findOne({
      providerId,
      dateTime: new Date(dateTime),
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existingAppointment) {
      return NextResponse.json({ error: 'This time slot is already booked' }, { status: 409 });
    }

    const appointment = await Appointment.create({
      petId,
      providerId,
      ownerId: user.userId,
      serviceType,
      dateTime: new Date(dateTime),
      duration: duration || 60,
      notes,
      price,
      status: 'pending',
    });

    // Notify the provider
    await Notification.create({
      userId: providerId,
      type: 'NEW_BOOKING',
      message: `You have a new booking request for ${serviceType} on ${new Date(dateTime).toDateString()}`,
      isRead: false,
    });

    // Notify the owner
    await Notification.create({
      userId: user.userId,
      type: 'BOOKING_CONFIRMATION',
      message: `Your ${serviceType} appointment on ${new Date(dateTime).toDateString()} has been requested successfully`,
      isRead: false,
    });

    return NextResponse.json({ message: 'Appointment booked successfully', appointment }, { status: 201 });
  } catch (error) {
    console.error('Create appointment error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

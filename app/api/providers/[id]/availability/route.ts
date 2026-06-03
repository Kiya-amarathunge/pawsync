import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ServiceProvider from '@/models/ServiceProvider';
import Appointment from '@/models/Appointment';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET /api/providers/[id]/availability
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const { searchParams } = req.nextUrl;
    const date = searchParams.get('date');

    if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

    const provider = await ServiceProvider.findOne({ providerId: id });
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    // Get booked slots for that date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      providerId: id,
      dateTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] },
    });

    const bookedTimes = bookedAppointments.map((a) =>
      new Date(a.dateTime).getHours()
    );

    // Generate available slots (9am to 5pm)
    const allSlots = [9, 10, 11, 12, 13, 14, 15, 16, 17];
    const availableSlots = allSlots
      .filter((hour) => !bookedTimes.includes(hour))
      .map((hour) => ({
        time: `${hour}:00`,
        label: hour < 12 ? `${hour}:00 AM` : `${hour === 12 ? 12 : hour - 12}:00 PM`,
      }));

    return NextResponse.json({ availableSlots, date });
  } catch (error) {
    console.error('Get availability error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// PUT /api/providers/[id]/availability
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { availability, blockedDates } = await req.json();

    const provider = await ServiceProvider.findOneAndUpdate(
      { providerId: user.userId },
      { $set: { availability, blockedDates } },
      { new: true }
    );

    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    return NextResponse.json({ message: 'Availability updated successfully', provider });
  } catch (error) {
    console.error('Update availability error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
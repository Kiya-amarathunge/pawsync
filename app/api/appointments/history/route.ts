import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/models/Appointment';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET /api/appointments/history
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = 20;

    const filter: any =
      user.role === 'pet_owner'
        ? { ownerId: user.userId, status: { $in: ['completed', 'cancelled'] } }
        : { providerId: user.userId, status: { $in: ['completed', 'cancelled'] } };

    const appointments = await Appointment.find(filter)
      .sort({ dateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('petId', 'name species')
      .populate('ownerId', 'name email')
      .populate('providerId', 'name email');

    const total = await Appointment.countDocuments(filter);

    return NextResponse.json({ appointments, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get appointment history error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

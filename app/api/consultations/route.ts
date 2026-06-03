import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Consultation from '@/models/Consultation';
import Appointment from '@/models/Appointment';
import { verifyToken } from '@/lib/jwt';
import { randomUUID } from 'crypto';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// POST /api/consultations — start a consultation
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { appointmentId } = await req.json();
    if (!appointmentId) return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    if (appointment.serviceType !== 'telemedicine') {
      return NextResponse.json({ error: 'This appointment is not a telemedicine consultation' }, { status: 400 });
    }

    // Generate a unique room ID for WebRTC
    const roomId = randomUUID();

    const consultation = await Consultation.create({
      appointmentId,
      vetId: appointment.providerId,
      ownerId: appointment.ownerId,
      petId: appointment.petId,
      type: 'routine',
      recordingMetadata: roomId,
    });

    return NextResponse.json({
      message: 'Consultation started',
      consultation,
      roomId,
    }, { status: 201 });
  } catch (error) {
    console.error('Start consultation error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

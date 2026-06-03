import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Consultation from '@/models/Consultation';
import HealthRecord from '@/models/HealthRecord';
import Appointment from '@/models/Appointment';
import { verifyToken } from '@/lib/jwt';
import crypto from 'crypto';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// PATCH /api/consultations/[id]/end
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { diagnosis, prescription, duration, notes } = await req.json();

    const consultation = await Consultation.findOneAndUpdate(
      { _id: id, vetId: user.userId },
      { $set: { diagnosis, prescription, duration, notes } },
      { new: true }
    );

    if (!consultation) return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });

    // Save to health record automatically
    const content = JSON.stringify({ petId: consultation.petId, diagnosis, prescription });
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    await HealthRecord.create({
      petId: consultation.petId,
      ownerId: consultation.ownerId,
      date: new Date(),
      diagnosis,
      treatment: notes,
      prescriptions: prescription ? [prescription] : [],
      addedBy: user.userId,
      version: 1,
      checksum,
    });

    // Mark appointment as completed
    await Appointment.findByIdAndUpdate(consultation.appointmentId, { status: 'completed' });

    return NextResponse.json({ message: 'Consultation ended and health record saved', consultation });
  } catch (error) {
    console.error('End consultation error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
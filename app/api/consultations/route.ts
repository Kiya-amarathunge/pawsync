import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Consultation from '@/models/Consultation';
import Appointment from '@/models/Appointment';
import Pet from '@/models/Pet';
import { getRequestUser, hasRole } from '@/lib/request-auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { appointmentId } = await req.json();
    if (!appointmentId) return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      serviceType: 'telemedicine',
      status: 'confirmed',
      $or: [{ ownerId: user.userId }, { providerId: user.userId }],
    });
    if (!appointment) return NextResponse.json({ error: 'Confirmed telemedicine appointment not found' }, { status: 404 });
    let consultation = await Consultation.findOne({ appointmentId });
    if (!consultation) {
      consultation = await Consultation.create({
        appointmentId, vetId: appointment.providerId, ownerId: appointment.ownerId,
        petId: appointment.petId, type: 'routine', recordingMetadata: randomUUID(), status: 'active',
      });
    }
    if (consultation.status === 'completed') return NextResponse.json({ error: 'This consultation has ended' }, { status: 409 });
    const pet = await Pet.findById(appointment.petId).select('name species breed');
    return NextResponse.json({ message: 'Consultation ready', consultation, pet, roomId: consultation.recordingMetadata });
  } catch (error) {
    console.error('Start consultation error:', error);
    return NextResponse.json({ error: 'Unable to start consultation' }, { status: 500 });
  }
}

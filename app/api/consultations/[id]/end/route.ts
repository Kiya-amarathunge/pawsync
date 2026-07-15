import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Consultation from '@/models/Consultation';
import HealthRecord from '@/models/HealthRecord';
import Appointment from '@/models/Appointment';
import Notification from '@/models/Notification';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { encryptHealthPayload } from '@/lib/health-encryption';

const summarySchema = z.object({
  diagnosis: z.string().trim().min(1).max(2000),
  prescription: z.string().trim().max(2000).optional().default(''),
  duration: z.number().int().nonnegative(),
  notes: z.string().trim().max(5000).optional().default(''),
  type: z.enum(['routine', 'emergency']).default('routine'),
  callQuality: z.number().min(0).max(5).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['veterinarian'])) return NextResponse.json({ error: 'Veterinarian access required' }, { status: 403 });
    const parsed = summarySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const { id } = await params;
    const consultation = await Consultation.findOne({ _id: id, vetId: user.userId, status: 'active' });
    if (!consultation) return NextResponse.json({ error: 'Active consultation not found' }, { status: 404 });
    const data = parsed.data;
    const summary = `${data.diagnosis}${data.prescription ? ` Prescription: ${data.prescription}` : ''}`;
    Object.assign(consultation, data, { status: 'completed', endedAt: new Date(), summary });
    await consultation.save();
    const payload = { diagnosis: data.diagnosis, treatment: data.notes, prescriptions: data.prescription ? [data.prescription] : [] };
    const encrypted = encryptHealthPayload(payload);
    await HealthRecord.create({
      petId: consultation.petId, ownerId: consultation.ownerId, date: new Date(), addedBy: user.userId,
      version: 1, ...encrypted, versionHistory: [{ version: 1, ...encrypted, changedBy: user.userId, changedAt: new Date() }],
    });
    await Appointment.findByIdAndUpdate(consultation.appointmentId, { status: 'completed' });
    await Notification.create({ userId: consultation.ownerId, type: 'CONSULTATION_SUMMARY', message: `Your consultation summary is ready: ${summary}`, isRead: false });
    return NextResponse.json({ message: 'Consultation ended and encrypted summary saved', consultation });
  } catch (error) {
    console.error('End consultation error:', error);
    return NextResponse.json({ error: 'Unable to end consultation' }, { status: 500 });
  }
}

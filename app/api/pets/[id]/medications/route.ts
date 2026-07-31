/**
 * PawSync API route: /api/pets/[id]/medications
 *
 * Domain: pet profiles and care information.
 * Methods: POST.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Pet from '@/models/Pet';
import Notification from '@/models/Notification';
import { getRequestUser, hasRole } from '@/lib/request-auth';

const medicationSchema = z.object({
  medication: z.string().trim().min(1).max(120),
  dosage: z.string().trim().min(1).max(120),
  frequency: z.string().trim().min(1).max(120),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()).optional().or(z.literal('')),
  nextReminderAt: z.string().datetime().optional().or(z.literal('')),
});

interface MedicationRecord {
  _id: unknown;
  medication: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  nextReminderAt?: Date;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const parsed = medicationSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    const schedule = {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      nextReminderAt: parsed.data.nextReminderAt ? new Date(parsed.data.nextReminderAt) : undefined,
    };
    pet.medicationSchedules.push(schedule);
    await pet.save();
    if (schedule.nextReminderAt) {
      await Notification.create({
        userId: user.userId,
        type: 'MEDICATION_REMINDER',
        message: `${pet.name}: ${schedule.medication} ${schedule.dosage} (${schedule.frequency})`,
        isRead: false,
      });
    }
    return NextResponse.json({ message: 'Medication schedule added', pet }, { status: 201 });
  } catch (error) {
    console.error('Add medication error:', error);
    return NextResponse.json({ error: 'Unable to add medication schedule' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    const parsed = medicationSchema.safeParse(body);
    if (!parsed.success || !body.recordId) {
      return NextResponse.json({ error: parsed.success ? 'Medication record is required' : parsed.error.issues[0].message }, { status: 400 });
    }
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    const record = pet.medicationSchedules.find(
      (entry: MedicationRecord) => String(entry._id) === String(body.recordId),
    );
    if (!record) return NextResponse.json({ error: 'Medication record not found' }, { status: 404 });
    record.medication = parsed.data.medication;
    record.dosage = parsed.data.dosage;
    record.frequency = parsed.data.frequency;
    record.startDate = new Date(parsed.data.startDate);
    record.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : undefined;
    record.nextReminderAt = parsed.data.nextReminderAt ? new Date(parsed.data.nextReminderAt) : undefined;
    await pet.save();
    return NextResponse.json({ message: 'Medication record updated', pet });
  } catch (error) {
    console.error('Update medication error:', error);
    return NextResponse.json({ error: 'Unable to update medication record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const recordId = req.nextUrl.searchParams.get('recordId');
    if (!recordId) return NextResponse.json({ error: 'Medication record is required' }, { status: 400 });
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    const index = pet.medicationSchedules.findIndex(
      (entry: MedicationRecord) => String(entry._id) === recordId,
    );
    if (index < 0) return NextResponse.json({ error: 'Medication record not found' }, { status: 404 });
    pet.medicationSchedules.splice(index, 1);
    await pet.save();
    return NextResponse.json({ message: 'Medication record deleted' });
  } catch (error) {
    console.error('Delete medication error:', error);
    return NextResponse.json({ error: 'Unable to delete medication record' }, { status: 500 });
  }
}

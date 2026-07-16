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

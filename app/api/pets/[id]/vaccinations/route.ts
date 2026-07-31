/**
 * PawSync API route: /api/pets/[id]/vaccinations
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
import { verifyToken } from '@/lib/jwt';

const vaccinationSchema = z.object({
  vaccine: z.string().trim().min(1).max(120),
  date: z.string().date(),
  nextDueDate: z.string().date().optional().or(z.literal('')),
});

interface VaccinationRecord {
  _id: unknown;
  vaccine: string;
  date: Date;
  nextDueDate?: Date;
  reminderSent: boolean;
}

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { vaccine, date, nextDueDate } = body;
    if (!vaccine || !date) {
      return NextResponse.json({ error: 'Vaccine name and date are required' }, { status: 400 });
    }
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    pet.vaccinationHistory.push({ vaccine, date: new Date(date), nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined, reminderSent: false });
    await pet.save();
    return NextResponse.json({ message: 'Vaccination record added successfully', pet }, { status: 201 });
  } catch (error) {
    console.error('Add vaccination error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'pet_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    const parsed = vaccinationSchema.safeParse(body);
    if (!parsed.success || !body.recordId) {
      return NextResponse.json({ error: parsed.success ? 'Vaccination record is required' : parsed.error.issues[0].message }, { status: 400 });
    }
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    const record = pet.vaccinationHistory.find(
      (entry: VaccinationRecord) => String(entry._id) === String(body.recordId),
    );
    if (!record) return NextResponse.json({ error: 'Vaccination record not found' }, { status: 404 });
    record.vaccine = parsed.data.vaccine;
    record.date = new Date(parsed.data.date);
    record.nextDueDate = parsed.data.nextDueDate ? new Date(parsed.data.nextDueDate) : undefined;
    record.reminderSent = false;
    await pet.save();
    return NextResponse.json({ message: 'Vaccination record updated', pet });
  } catch (error) {
    console.error('Update vaccination error:', error);
    return NextResponse.json({ error: 'Unable to update vaccination record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'pet_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const recordId = req.nextUrl.searchParams.get('recordId');
    if (!recordId) return NextResponse.json({ error: 'Vaccination record is required' }, { status: 400 });
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    const index = pet.vaccinationHistory.findIndex(
      (entry: VaccinationRecord) => String(entry._id) === recordId,
    );
    if (index < 0) return NextResponse.json({ error: 'Vaccination record not found' }, { status: 404 });
    pet.vaccinationHistory.splice(index, 1);
    await pet.save();
    return NextResponse.json({ message: 'Vaccination record deleted' });
  } catch (error) {
    console.error('Delete vaccination error:', error);
    return NextResponse.json({ error: 'Unable to delete vaccination record' }, { status: 500 });
  }
}

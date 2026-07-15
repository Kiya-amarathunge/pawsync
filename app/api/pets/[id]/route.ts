import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Pet from '@/models/Pet';
import HealthRecord from '@/models/HealthRecord';
import { getRequestUser, hasRole } from '@/lib/request-auth';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  species: z.string().trim().min(1).max(50).optional(),
  breed: z.string().trim().max(80).optional(),
  birthDate: z.string().date().optional().or(z.literal('')),
  weight: z.number().positive().max(500).optional(),
  microchipNumber: z.string().trim().max(80).optional(),
  dietaryInfo: z.string().trim().max(2000).optional(),
  dietEffect: z.string().trim().max(1000).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const accessFilter = user.role === 'veterinarian'
      ? { _id: id, 'sharedWith.veterinarianId': user.userId }
      : { _id: id, ownerId: user.userId };
    const pet = await Pet.findOne(accessFilter);
    if (!pet) return NextResponse.json({ error: 'Pet not found or access not granted' }, { status: 404 });
    return NextResponse.json({ pet });
  } catch (error) {
    console.error('Get pet error:', error);
    return NextResponse.json({ error: 'Unable to load pet' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    const data = parsed.data;
    if (data.weight && data.weight !== pet.weight) {
      pet.weightHistory.push({ weight: data.weight, date: new Date() });
    }
    if (data.dietaryInfo && data.dietaryInfo !== pet.dietaryInfo) {
      pet.dietHistory.push({
        description: data.dietaryInfo,
        date: new Date(),
        observedEffect: data.dietEffect,
      });
    }
    Object.assign(pet, data, { birthDate: data.birthDate ? new Date(data.birthDate) : pet.birthDate });
    await pet.save();
    return NextResponse.json({ message: 'Pet updated successfully', pet });
  } catch (error) {
    console.error('Update pet error:', error);
    return NextResponse.json({ error: 'Unable to update pet' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const pet = await Pet.findOneAndDelete({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    await HealthRecord.deleteMany({ petId: id, ownerId: user.userId });
    return NextResponse.json({ message: 'Pet and associated records deleted successfully' });
  } catch (error) {
    console.error('Delete pet error:', error);
    return NextResponse.json({ error: 'Unable to delete pet' }, { status: 500 });
  }
}

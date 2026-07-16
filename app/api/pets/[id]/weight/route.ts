/**
 * PawSync API route: /api/pets/[id]/weight
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
import { getRequestUser, hasRole } from '@/lib/request-auth';

const weightSchema = z.object({
  weight: z.number().positive().max(500),
  date: z.string().date().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) {
      return NextResponse.json({ error: 'Pet owner access required' }, { status: 403 });
    }

    const parsed = weightSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { id } = await params;
    const recordedAt = parsed.data.date
      ? new Date(`${parsed.data.date}T12:00:00`)
      : new Date();
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });

    pet.weight = parsed.data.weight;
    pet.weightHistory.push({ weight: parsed.data.weight, date: recordedAt });
    await pet.save();

    return NextResponse.json({ message: 'Weight entry added', pet });
  } catch (error) {
    console.error('Add pet weight error:', error);
    return NextResponse.json({ error: 'Unable to add weight entry' }, { status: 500 });
  }
}

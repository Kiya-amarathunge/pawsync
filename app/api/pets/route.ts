/**
 * PawSync API route: /api/pets
 *
 * Domain: pet profiles and care information.
 * Methods: GET, POST.
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

const petSchema = z.object({
  name: z.string().trim().min(1).max(80),
  species: z.string().trim().min(1).max(50),
  breed: z.string().trim().max(80).optional().default(''),
  birthDate: z.string().date().optional().or(z.literal('')),
  weight: z.number().positive().max(500).optional(),
  microchipNumber: z.string().trim().max(80).optional().default(''),
  dietaryInfo: z.string().trim().max(2000).optional().default(''),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) {
      return NextResponse.json({ error: 'Pet owner access required' }, { status: 403 });
    }
    const pets = await Pet.find({ ownerId: user.userId }).sort({ createdAt: -1 });
    return NextResponse.json({ pets });
  } catch (error) {
    console.error('Get pets error:', error);
    return NextResponse.json({ error: 'Unable to load pets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) {
      return NextResponse.json({ error: 'Pet owner access required' }, { status: 403 });
    }
    const parsed = petSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const data = parsed.data;
    const pet = await Pet.create({
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      ownerId: user.userId,
      weightHistory: data.weight ? [{ weight: data.weight, date: new Date() }] : [],
      dietHistory: data.dietaryInfo
        ? [{ description: data.dietaryInfo, date: new Date() }]
        : [],
    });
    return NextResponse.json({ message: 'Pet created successfully', pet }, { status: 201 });
  } catch (error) {
    console.error('Create pet error:', error);
    return NextResponse.json({ error: 'Unable to create pet' }, { status: 500 });
  }
}

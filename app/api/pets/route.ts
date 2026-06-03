import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pet from '@/models/Pet';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET /api/pets — get all pets for logged in owner
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pets = await Pet.find({ ownerId: user.userId }).sort({ createdAt: -1 });

    return NextResponse.json({ pets });
  } catch (error) {
    console.error('Get pets error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// POST /api/pets — create a new pet
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const { name, species, breed, birthDate, weight, microchipNumber, dietaryInfo } = body;

    if (!name || !species) {
      return NextResponse.json({ error: 'Pet name and species are required' }, { status: 400 });
    }

    const pet = await Pet.create({
      ownerId: user.userId,
      name,
      species,
      breed,
      birthDate,
      weight,
      microchipNumber,
      dietaryInfo,
    });

    return NextResponse.json({ message: 'Pet created successfully', pet }, { status: 201 });
  } catch (error) {
    console.error('Create pet error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

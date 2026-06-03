import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pet from '@/models/Pet';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

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
    const { vetEmail } = await req.json();
    if (!vetEmail) return NextResponse.json({ error: 'Vet email is required' }, { status: 400 });
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    const vet = await User.findOne({ email: vetEmail, role: 'veterinarian' });
    if (!vet) return NextResponse.json({ error: 'Veterinarian not found with that email' }, { status: 404 });
    const alreadyShared = pet.medicalEvents.some(
      (e: any) => e.vetId?.toString() === vet._id.toString()
    );
    if (alreadyShared) {
      return NextResponse.json({ message: 'Records already shared with this vet' });
    }
    pet.medicalEvents.push({
      type: 'ACCESS_GRANTED',
      date: new Date(),
      notes: `Access granted to Dr. ${vet.name}`,
      vetId: vet._id,
    });
    await pet.save();
    return NextResponse.json({ message: `Pet records shared with ${vet.name} successfully` });
  } catch (error) {
    console.error('Share pet error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
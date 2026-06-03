import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pet from '@/models/Pet';
import Notification from '@/models/Notification';
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
    const body = await req.json();
    const { vaccine, date, nextDueDate } = body;
    if (!vaccine || !date) {
      return NextResponse.json({ error: 'Vaccine name and date are required' }, { status: 400 });
    }
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    pet.vaccinationHistory.push({ vaccine, date: new Date(date), nextDueDate: new Date(nextDueDate) });
    await pet.save();
    if (nextDueDate) {
      await Notification.create({
        userId: user.userId,
        type: 'VACCINATION_REMINDER',
        message: `Upcoming vaccination for ${pet.name}: ${vaccine} is due on ${new Date(nextDueDate).toDateString()}`,
        isRead: false,
      });
    }
    return NextResponse.json({ message: 'Vaccination record added successfully', pet }, { status: 201 });
  } catch (error) {
    console.error('Add vaccination error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    return NextResponse.json({ pet });
  } catch (error) {
    console.error('Get pet error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const pet = await Pet.findOneAndUpdate(
      { _id: id, ownerId: user.userId },
      { $set: body },
      { new: true }
    );
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    return NextResponse.json({ message: 'Pet updated successfully', pet });
  } catch (error) {
    console.error('Update pet error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const pet = await Pet.findOneAndDelete({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    return NextResponse.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    console.error('Delete pet error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
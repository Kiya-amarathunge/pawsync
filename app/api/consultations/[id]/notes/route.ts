import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Consultation from '@/models/Consultation';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// PATCH /api/consultations/[id]/notes
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { notes } = await req.json();

    const consultation = await Consultation.findOneAndUpdate(
      { _id: id, vetId: user.userId },
      { $set: { notes } },
      { new: true }
    );

    if (!consultation) return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });

    return NextResponse.json({ message: 'Notes saved successfully', consultation });
  } catch (error) {
    console.error('Save notes error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
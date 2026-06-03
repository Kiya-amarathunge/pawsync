import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Consultation from '@/models/Consultation';
import HealthRecord from '@/models/HealthRecord';
import Pet from '@/models/Pet';
import { verifyToken } from '@/lib/jwt';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// GET /api/consultations/[id]/records
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const consultation = await Consultation.findById(id);
    if (!consultation) return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });

    const pet = await Pet.findById(consultation.petId);
    const healthRecords = await HealthRecord.find({ petId: consultation.petId }).sort({ date: -1 });

    return NextResponse.json({ pet, healthRecords });
  } catch (error) {
    console.error('Get consultation records error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
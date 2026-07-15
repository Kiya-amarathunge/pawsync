import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Consultation from '@/models/Consultation';
import HealthRecord from '@/models/HealthRecord';
import Pet from '@/models/Pet';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { decryptHealthPayload } from '@/lib/health-encryption';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['veterinarian'])) return NextResponse.json({ error: 'Veterinarian access required' }, { status: 403 });
    const { id } = await params;
    const consultation = await Consultation.findOne({ _id: id, vetId: user.userId });
    if (!consultation) return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    const [pet, encryptedRecords] = await Promise.all([
      Pet.findById(consultation.petId),
      HealthRecord.find({ petId: consultation.petId }).select('+encryptedData +encryptionIv +encryptionTag').sort({ date: -1 }),
    ]);
    const healthRecords = encryptedRecords.map(record => {
      const object = record.toObject();
      delete object.encryptedData; delete object.encryptionIv; delete object.encryptionTag;
      return { ...object, ...decryptHealthPayload(record) };
    });
    return NextResponse.json({ pet, healthRecords });
  } catch (error) {
    console.error('Get consultation records error:', error);
    return NextResponse.json({ error: 'Unable to load patient records' }, { status: 500 });
  }
}

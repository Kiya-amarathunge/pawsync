import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import HealthRecord from '@/models/HealthRecord';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { findAccessiblePet } from '@/lib/pet-access';
import { decryptHealthPayload } from '@/lib/health-encryption';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const record = await HealthRecord.findById(id).populate('versionHistory.changedBy', 'name role');
    if (!record || !await findAccessiblePet(String(record.petId), user)) return NextResponse.json({ error: 'Record not found or access not granted' }, { status: 404 });
    const requestedVersion = Number(req.nextUrl.searchParams.get('version'));
    if (requestedVersion) {
      const snapshot = record.versionHistory.find((entry: { version: number }) => entry.version === requestedVersion);
      if (!snapshot) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
      return NextResponse.json({ version: snapshot.version, changedAt: snapshot.changedAt, changedBy: snapshot.changedBy, payload: decryptHealthPayload(snapshot) });
    }
    return NextResponse.json({ versions: record.versionHistory.map((entry: { version: number; changedAt: Date; changedBy: unknown; checksum: string }) => ({ version: entry.version, changedAt: entry.changedAt, changedBy: entry.changedBy, checksum: entry.checksum })) });
  } catch (error) {
    console.error('Get record versions error:', error);
    return NextResponse.json({ error: 'Unable to load version history' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import HealthRecord from '@/models/HealthRecord';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { findAccessiblePet } from '@/lib/pet-access';
import { decryptHealthPayload, encryptHealthPayload, type HealthPayload } from '@/lib/health-encryption';

const updateSchema = z.object({
  diagnosis: z.string().trim().max(2000).optional(),
  treatment: z.string().trim().max(4000).optional(),
  prescriptions: z.array(z.string().trim().max(500)).max(50).optional(),
  medicationSchedule: z.array(z.object({
    medication: z.string().trim().min(1).max(120),
    dosage: z.string().trim().max(120),
    frequency: z.string().trim().max(120),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).optional(),
  date: z.string().datetime().or(z.string().date()).optional(),
});

async function getAccessibleRecord(id: string, user: NonNullable<ReturnType<typeof getRequestUser>>) {
  const record = await HealthRecord.findById(id).select('+encryptedData +encryptionIv +encryptionTag');
  if (!record || !await findAccessiblePet(String(record.petId), user)) return null;
  return record;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const record = await getAccessibleRecord(id, user);
    if (!record) return NextResponse.json({ error: 'Health record not found or access not granted' }, { status: 404 });
    const payload = decryptHealthPayload(record);
    const object = record.toObject();
    delete object.encryptedData;
    delete object.encryptionIv;
    delete object.encryptionTag;
    return NextResponse.json({ record: { ...object, ...payload, versionHistoryCount: record.versionHistory.length } });
  } catch (error) {
    console.error('Get health record error:', error);
    return NextResponse.json({ error: 'Unable to load health record' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const record = await getAccessibleRecord(id, user);
    if (!record) return NextResponse.json({ error: 'Health record not found or access not granted' }, { status: 404 });
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const current = decryptHealthPayload(record);
    const payload: HealthPayload = { ...current, ...parsed.data };
    const encrypted = encryptHealthPayload(payload);
    record.version += 1;
    Object.assign(record, encrypted);
    if (parsed.data.date) record.date = new Date(parsed.data.date);
    record.versionHistory.push({
      version: record.version,
      ...encrypted,
      changedBy: user.userId,
      changedAt: new Date(),
    });
    await record.save();
    const updated = record.toObject();
    delete updated.encryptedData;
    delete updated.encryptionIv;
    delete updated.encryptionTag;
    delete updated.versionHistory;
    return NextResponse.json({ message: 'Health record updated and versioned', record: { ...updated, ...payload, versionHistoryCount: record.versionHistory.length } });
  } catch (error) {
    console.error('Update health record error:', error);
    return NextResponse.json({ error: 'Unable to update health record' }, { status: 500 });
  }
}

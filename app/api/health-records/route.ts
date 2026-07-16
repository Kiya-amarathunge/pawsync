/**
 * PawSync API route: /api/health-records
 *
 * Domain: encrypted pet health-record management.
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
import HealthRecord from '@/models/HealthRecord';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { findAccessiblePet } from '@/lib/pet-access';
import { decryptHealthPayload, encryptHealthPayload, type HealthPayload } from '@/lib/health-encryption';

const recordSchema = z.object({
  petId: z.string().min(1),
  diagnosis: z.string().trim().max(2000).optional().default(''),
  treatment: z.string().trim().max(4000).optional().default(''),
  prescriptions: z.array(z.string().trim().max(500)).max(50).optional().default([]),
  medicationSchedule: z.array(z.object({
    medication: z.string().trim().min(1).max(120),
    dosage: z.string().trim().max(120),
    frequency: z.string().trim().max(120),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).optional().default([]),
  date: z.string().datetime().or(z.string().date()).optional(),
});

function serializeRecord(record: Record<string, unknown>, payload: HealthPayload) {
  const { encryptedData, encryptionIv, encryptionTag, versionHistory, ...safe } = record;
  void encryptedData;
  void encryptionIv;
  void encryptionTag;
  return { ...safe, ...payload, versionHistoryCount: Array.isArray(versionHistory) ? versionHistory.length : 0 };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const petId = req.nextUrl.searchParams.get('petId');
    const search = req.nextUrl.searchParams.get('search')?.trim().toLowerCase();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
    const limit = 20;
    if (petId && !await findAccessiblePet(petId, user)) {
      return NextResponse.json({ error: 'Pet not found or access not granted' }, { status: 404 });
    }

    const filter = user.role === 'pet_owner'
      ? { ownerId: user.userId, ...(petId ? { petId } : {}) }
      : petId
        ? { petId }
        : { _id: null };
    const encryptedRecords = await HealthRecord.find(filter)
      .select('+encryptedData +encryptionIv +encryptionTag')
      .sort({ date: -1 });
    const records = encryptedRecords.map(record => {
      const payload = decryptHealthPayload(record);
      return serializeRecord(record.toObject(), payload);
    }).filter(record => !search || JSON.stringify(record).toLowerCase().includes(search));
    const start = (page - 1) * limit;
    return NextResponse.json({
      records: records.slice(start, start + limit),
      total: records.length,
      page,
      pages: Math.ceil(records.length / limit),
    });
  } catch (error) {
    console.error('Get health records error:', error);
    return NextResponse.json({ error: 'Unable to load health records' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const parsed = recordSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const pet = await findAccessiblePet(parsed.data.petId, user);
    if (!pet) return NextResponse.json({ error: 'Pet not found or access not granted' }, { status: 404 });
    const payload: HealthPayload = {
      diagnosis: parsed.data.diagnosis,
      treatment: parsed.data.treatment,
      prescriptions: parsed.data.prescriptions,
      medicationSchedule: parsed.data.medicationSchedule,
    };
    const encrypted = encryptHealthPayload(payload);
    const record = await HealthRecord.create({
      petId: pet._id,
      ownerId: pet.ownerId,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      addedBy: user.userId,
      version: 1,
      ...encrypted,
      versionHistory: [{ version: 1, ...encrypted, changedBy: user.userId, changedAt: new Date() }],
    });
    return NextResponse.json({
      message: 'Encrypted health record created successfully',
      record: serializeRecord(record.toObject(), payload),
    }, { status: 201 });
  } catch (error) {
    console.error('Create health record error:', error);
    return NextResponse.json({ error: 'Unable to create health record' }, { status: 500 });
  }
}

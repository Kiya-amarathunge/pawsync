/**
 * PawSync API route: /api/health-records/[id]/documents
 *
 * Domain: encrypted pet health-record management.
 * Methods: POST.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import connectDB from '@/lib/db';
import HealthRecord from '@/models/HealthRecord';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { findAccessiblePet } from '@/lib/pet-access';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const record = await HealthRecord.findById(id);
    if (!record || !await findAccessiblePet(String(record.petId), user)) {
      return NextResponse.json({ error: 'Health record not found or access not granted' }, { status: 404 });
    }
    const file = (await req.formData()).get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPG, and PNG files are allowed' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File size must not exceed 10MB' }, { status: 400 });
    const storageKey = `${crypto.randomUUID()}${path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '')}`;
    const directory = path.join(process.cwd(), 'storage', 'health-documents');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, storageKey), Buffer.from(await file.arrayBuffer()));
    record.documents.push({ filename: file.name.slice(0, 200), storageKey, mimeType: file.type, uploadedAt: new Date() });
    await record.save();
    return NextResponse.json({ message: 'Medical document uploaded securely', record }, { status: 201 });
  } catch (error) {
    console.error('Upload health document error:', error);
    return NextResponse.json({ error: 'Unable to upload document' }, { status: 500 });
  }
}

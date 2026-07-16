/**
 * PawSync API route: /api/provider/profile/credentials
 *
 * Domain: provider profiles, dashboards, and operations.
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
import ServiceProvider from '@/models/ServiceProvider';
import Veterinarian from '@/models/Veterinarian';
import { getRequestUser, hasRole } from '@/lib/request-auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['veterinarian', 'service_provider'])) return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    const file = (await req.formData()).get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No credential document uploaded' }, { status: 400 });
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Credential must be PDF, JPG, or PNG and no larger than 10MB' }, { status: 400 });
    }
    const storageKey = `${crypto.randomUUID()}${path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '')}`;
    const directory = path.join(process.cwd(), 'storage', 'provider-credentials');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, storageKey), Buffer.from(await file.arrayBuffer()));
    const update = { $push: { verificationDocuments: storageKey } };
    const profile = user.role === 'veterinarian'
      ? await Veterinarian.findOneAndUpdate({ vetId: user.userId }, update, { new: true })
      : await ServiceProvider.findOneAndUpdate({ providerId: user.userId }, update, { new: true });
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    return NextResponse.json({ message: 'Credential uploaded for administrator review' }, { status: 201 });
  } catch (error) {
    console.error('Upload provider credential error:', error);
    return NextResponse.json({ error: 'Unable to upload credential' }, { status: 500 });
  }
}

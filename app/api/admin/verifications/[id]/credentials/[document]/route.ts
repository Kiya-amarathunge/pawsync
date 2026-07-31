/**
 * PawSync API route: /api/admin/verifications/[id]/credentials/[document]
 *
 * Domain: administration, moderation, reporting, and platform oversight.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import connectDB from '@/lib/db';
import User from '@/models/User';
import ServiceProvider from '@/models/ServiceProvider';
import Veterinarian from '@/models/Veterinarian';
import { getRequestUser } from '@/lib/request-auth';
import { providerCredentialPath } from '@/lib/file-storage';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; document: string }> }) {
  try {
    await connectDB(); const admin = getRequestUser(req); if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, document } = await params; const user = await User.findById(id).select('role'); if (!user) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    const profile = user.role === 'veterinarian' ? await Veterinarian.findOne({ vetId: id }) : await ServiceProvider.findOne({ providerId: id });
    if (!profile || !profile.verificationDocuments.includes(document) || !/^[a-f0-9-]+\.(pdf|jpg|jpeg|png)$/i.test(document)) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    const content = await readFile(providerCredentialPath(document)); const extension = path.extname(document).toLowerCase(); const mime = extension === '.pdf' ? 'application/pdf' : extension === '.png' ? 'image/png' : 'image/jpeg';
    return new NextResponse(content, { headers: { 'Content-Type': mime, 'Content-Disposition': `attachment; filename="credential${extension}"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error('Download credential error:', error); return NextResponse.json({ error: 'Unable to download credential' }, { status: 500 }); }
}

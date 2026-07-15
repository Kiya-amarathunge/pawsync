import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import connectDB from '@/lib/db';
import HealthRecord from '@/models/HealthRecord';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { findAccessiblePet } from '@/lib/pet-access';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner', 'veterinarian'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, documentId } = await params;
    const record = await HealthRecord.findById(id);
    if (!record || !await findAccessiblePet(String(record.petId), user)) {
      return NextResponse.json({ error: 'Health record not found or access not granted' }, { status: 404 });
    }
    const document = record.documents.id(documentId);
    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    const content = await readFile(path.join(process.cwd(), 'storage', 'health-documents', document.storageKey));
    return new NextResponse(content, { headers: {
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.filename.replace(/["\r\n]/g, '')}"`,
      'Cache-Control': 'private, no-store',
    } });
  } catch (error) {
    console.error('Download health document error:', error);
    return NextResponse.json({ error: 'Unable to download document' }, { status: 500 });
  }
}

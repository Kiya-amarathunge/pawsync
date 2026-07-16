/**
 * PawSync API route: /api/pets/[id]/documents/[documentId]
 *
 * Domain: pet profiles and care information.
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
import Pet from '@/models/Pet';
import { getRequestUser } from '@/lib/request-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    await connectDB();
    const { id, documentId } = await params;
    const user = getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = user.role === 'veterinarian'
      ? { _id: id, 'sharedWith.veterinarianId': user.userId }
      : { _id: id, ownerId: user.userId };
    const pet = await Pet.findOne(access);
    if (!pet) return NextResponse.json({ error: 'Pet not found or access not granted' }, { status: 404 });
    const document = pet.documents.id(documentId);
    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    const content = await readFile(path.join(process.cwd(), 'storage', 'pet-documents', document.storageKey));
    return new NextResponse(content, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.filename.replace(/["\r\n]/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Download pet document error:', error);
    return NextResponse.json({ error: 'Unable to download document' }, { status: 500 });
  }
}

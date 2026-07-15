import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import connectDB from '@/lib/db';
import Pet from '@/models/Pet';
import { getRequestUser, hasRole } from '@/lib/request-auth';

const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get('file');
    const kind = formData.get('kind') === 'photo' ? 'photo' : 'medical';
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    const allowedTypes = kind === 'photo'
      ? ['image/jpeg', 'image/png']
      : ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: kind === 'photo' ? 'Only JPG and PNG photos are allowed' : 'Only PDF, JPG, and PNG documents are allowed' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File size must not exceed 10MB' }, { status: 400 });

    const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const storageName = `${crypto.randomUUID()}${extension}`;
    const directory = kind === 'photo'
      ? path.join(process.cwd(), 'public', 'uploads', 'pets')
      : path.join(process.cwd(), 'storage', 'pet-documents');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, storageName), Buffer.from(await file.arrayBuffer()));

    if (kind === 'photo') {
      const url = `/uploads/pets/${storageName}`;
      pet.photos.push(url);
      await pet.save();
      return NextResponse.json({ message: 'Pet photo uploaded', url }, { status: 201 });
    }

    pet.documents.push({
      filename: file.name.slice(0, 200),
      storageKey: storageName,
      mimeType: file.type,
      uploadedAt: new Date(),
    });
    await pet.save();
    const document = pet.documents.at(-1);
    return NextResponse.json({
      message: 'Medical document uploaded securely',
      document: {
        id: document?._id,
        filename: document?.filename,
        downloadUrl: `/api/pets/${pet._id}/documents/${document?._id}`,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Upload pet file error:', error);
    return NextResponse.json({ error: 'Unable to upload file' }, { status: 500 });
  }
}

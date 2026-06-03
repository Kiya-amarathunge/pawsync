import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pet from '@/models/Pet';
import { verifyToken } from '@/lib/jwt';
import { writeFile } from 'fs/promises';
import path from 'path';

function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const pet = await Pet.findOne({ _id: id, ownerId: user.userId });
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and PDF files are allowed' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename);
    await writeFile(uploadPath, buffer);
    const fileUrl = `/uploads/${filename}`;
    pet.photos.push(fileUrl);
    await pet.save();
    return NextResponse.json({ message: 'File uploaded successfully', url: fileUrl }, { status: 201 });
  } catch (error) {
    console.error('Upload document error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
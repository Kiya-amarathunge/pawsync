import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import connectDB from '@/lib/db';
import Review from '@/models/Review';
import { getRequestUser, hasRole } from '@/lib/request-auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    const review = await Review.findOne({ _id: id, ownerId: user.userId });
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    if (review.photos.length >= 5) return NextResponse.json({ error: 'A review can contain up to five photos' }, { status: 400 });
    const file = (await req.formData()).get('file');
    if (!(file instanceof File) || !['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Photo must be JPG or PNG and no larger than 5MB' }, { status: 400 });
    const filename = `${crypto.randomUUID()}${path.extname(file.name).toLowerCase()}`;
    const directory = path.join(process.cwd(), 'public', 'uploads', 'reviews'); await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
    const url = `/uploads/reviews/${filename}`; review.photos.push(url); await review.save();
    return NextResponse.json({ message: 'Review photo uploaded', url }, { status: 201 });
  } catch (error) {
    console.error('Upload review photo error:', error);
    return NextResponse.json({ error: 'Unable to upload review photo' }, { status: 500 });
  }
}

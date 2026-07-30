/**
 * PawSync API route: /api/messages/attachments
 *
 * Domain: owner-provider messaging and attachments.
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
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import { getRequestUser } from '@/lib/request-auth';
import { createNotification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const form = await req.formData(); const receiverId = String(form.get('receiverId') || ''); const file = form.get('file');
    if (!mongoose.isValidObjectId(receiverId)) return NextResponse.json({ error: 'Recipient is invalid' }, { status: 400 });
    const receiver = await User.findOne({ _id: receiverId, isActive: true, isSuspended: false });
    if (!receiver || !(file instanceof File)) return NextResponse.json({ error: 'Recipient and file are required' }, { status: 400 });
    const roles = new Set([user.role, receiver.role]);
    if (!roles.has('pet_owner') || (!roles.has('veterinarian') && !roles.has('service_provider'))) {
      return NextResponse.json({ error: 'Attachments are limited to pet owner and provider conversations' }, { status: 403 });
    }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Attachment must be PDF, JPG, or PNG and no larger than 10MB' }, { status: 400 });
    const storageKey = `${crypto.randomUUID()}${path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '')}`;
    const directory = path.join(process.cwd(), 'storage', 'message-attachments'); await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, storageKey), Buffer.from(await file.arrayBuffer()));
    const message = await Message.create({ senderId: user.userId, receiverId, content: '', attachments: [{ filename: file.name.slice(0, 200), storageKey, mimeType: file.type, size: file.size }] });
    await createNotification({ userId: receiverId, type: 'NEW_MESSAGE', message: 'You received an attachment', actionUrl: `/messages?provider=${user.userId}` });
    return NextResponse.json({ message: 'Attachment sent', data: message }, { status: 201 });
  } catch (error) {
    console.error('Send message attachment error:', error);
    return NextResponse.json({ error: 'Unable to send attachment' }, { status: 500 });
  }
}

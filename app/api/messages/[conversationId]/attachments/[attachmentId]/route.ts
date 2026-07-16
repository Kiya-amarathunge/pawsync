/**
 * PawSync API route: /api/messages/[conversationId]/attachments/[attachmentId]
 *
 * Domain: owner-provider messaging and attachments.
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
import Message from '@/models/Message';
import { getRequestUser } from '@/lib/request-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string; attachmentId: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { conversationId: messageId, attachmentId } = await params;
    const message = await Message.findOne({ _id: messageId, $or: [{ senderId: user.userId }, { receiverId: user.userId }] });
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    const attachment = message.attachments.id(attachmentId);
    if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    const content = await readFile(path.join(process.cwd(), 'storage', 'message-attachments', attachment.storageKey));
    return new NextResponse(content, { headers: { 'Content-Type': attachment.mimeType, 'Content-Disposition': `attachment; filename="${attachment.filename.replace(/["\r\n]/g, '')}"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Download message attachment error:', error);
    return NextResponse.json({ error: 'Unable to download attachment' }, { status: 500 });
  }
}

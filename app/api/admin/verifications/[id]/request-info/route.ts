/**
 * PawSync API route: /api/admin/verifications/[id]/request-info
 *
 * Domain: administration, moderation, reporting, and platform oversight.
 * Methods: PATCH.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { getRequestUser } from '@/lib/request-auth';
import { sendProviderInformationRequestEmail } from '@/lib/mailer';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB(); const admin = getRequestUser(req); if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { note } = await req.json(); if (!note || String(note).trim().length < 10) return NextResponse.json({ error: 'A clear information request is required' }, { status: 400 });
    const { id } = await params; const user = await User.findOneAndUpdate({ _id: id, role: { $in: ['veterinarian', 'service_provider'] } }, { $set: { verificationStatus: 'more_info_requested', verificationNote: String(note).trim(), isActive: false } }, { new: true });
    if (!user) return NextResponse.json({ error: 'Provider application not found' }, { status: 404 });
    await sendProviderInformationRequestEmail(user.email, user.name, String(note).trim());
    await AuditLog.create({ adminId: admin.userId, actionType: 'PROVIDER_INFO_REQUESTED', affectedEntity: 'User', entityId: user._id, justification: String(note).trim() });
    return NextResponse.json({ message: 'Information request sent to provider' });
  } catch (error) { console.error('Request provider information error:', error); return NextResponse.json({ error: 'Unable to request information' }, { status: 500 }); }
}

/**
 * PawSync API route: /api/admin/verifications/[id]/reject
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
import { verifyToken } from '@/lib/jwt';
import nodemailer from 'nodemailer';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// PATCH /api/admin/verifications/[id]/reject
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { reason } = await req.json();

    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    user.isActive = false;
    user.isSuspended = true;
    user.verificationStatus = 'rejected';
    await user.save();

    // Send rejection email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    try {
      await transporter.sendMail({
        from: `"PawSync" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Update on your PawSync application',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1D9E75">Application Update</h2>
          <p>Hi ${user.name},</p>
          <p>After reviewing your application, we are unable to approve your account at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you have questions, please contact our support team.</p>
        </div>`,
      });
    } catch (emailError) {
      console.error('Provider rejection email delivery error:', emailError);
    }

    await AuditLog.create({
      adminId: admin.userId,
      actionType: 'PROVIDER_REJECTED',
      affectedEntity: 'User',
      entityId: user._id,
      justification: reason || 'Application rejected',
    });

    return NextResponse.json({ message: 'Provider rejected successfully' });
  } catch (error) {
    console.error('Reject provider error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

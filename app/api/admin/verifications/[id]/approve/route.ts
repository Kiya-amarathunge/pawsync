import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { verifyToken } from '@/lib/jwt';
import { sendVerificationEmail } from '@/lib/mailer';
import nodemailer from 'nodemailer';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// PATCH /api/admin/verifications/[id]/approve
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    user.isActive = true;
    await user.save();

    // Send approval email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"PawSync" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Your PawSync account has been approved!',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1D9E75">Account Approved! 🎉</h2>
        <p>Hi ${user.name},</p>
        <p>Your PawSync account has been reviewed and approved. You can now log in and start offering your services.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display:inline-block;background:#1D9E75;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0">Log In Now</a>
      </div>`,
    });

    // Log admin action
    await AuditLog.create({
      adminId: admin.userId,
      actionType: 'PROVIDER_APPROVED',
      affectedEntity: 'User',
      entityId: user._id,
      justification: 'Credentials verified and approved',
    });

    return NextResponse.json({ message: 'Provider approved successfully' });
  } catch (error) {
    console.error('Approve provider error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
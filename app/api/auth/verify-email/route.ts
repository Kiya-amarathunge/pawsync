import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Verification token is missing' }, { status: 400 });
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.purpose !== 'verify-email') {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.redirect(new URL('/login?message=already-verified', req.url));
    }

    user.isVerified = true;
    if (user.role === 'pet_owner') user.isActive = true;
    await user.save();

    return NextResponse.redirect(new URL('/login?message=verified', req.url));
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

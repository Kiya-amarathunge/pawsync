import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, signAccessToken } from '@/lib/jwt';

// POST /api/admin/auth/verify-totp
// Simple TOTP simulation — in production use a library like otplib
export async function POST(req: NextRequest) {
  try {
    const { totpCode, userId } = await req.json();

    if (!totpCode || !userId) {
      return NextResponse.json({ error: 'TOTP code and user ID are required' }, { status: 400 });
    }

    // For development: accept code '123456' as valid
    // In production replace this with real TOTP verification using otplib
    const isValid = totpCode === '123456';

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 401 });
    }

    // Issue admin token with 2FA verified flag
    const adminToken = signAccessToken({
      userId,
      role: 'admin',
      twoFactorVerified: true,
    });

    return NextResponse.json({
      message: '2FA verified successfully',
      accessToken: adminToken,
    });
  } catch (error) {
    console.error('TOTP verify error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, signAccessToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token found' }, { status: 401 });
    }

    const decoded = verifyToken(refreshToken);

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    const accessToken = signAccessToken({
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    });

    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

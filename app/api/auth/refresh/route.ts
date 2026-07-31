/**
 * PawSync API route: /api/auth/refresh
 *
 * Domain: account authentication and session management.
 * Methods: POST.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, signAccessToken, signRefreshToken } from '@/lib/jwt';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token found' }, { status: 401 });
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ _id: decoded.userId, isActive: true, isSuspended: false });
    if (!user) return NextResponse.json({ error: 'Account is no longer active' }, { status: 401 });
    const refreshedAccessToken = signAccessToken({
      userId: String(user._id),
      role: user.role,
      email: user.email,
      adminRole: user.adminRole,
    });

    const rotatedRefreshToken = signRefreshToken({
      userId: String(user._id),
      role: user.role,
      email: user.email,
      adminRole: user.adminRole,
    });
    const response = NextResponse.json({ accessToken: refreshedAccessToken });
    response.cookies.set('refreshToken', rotatedRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

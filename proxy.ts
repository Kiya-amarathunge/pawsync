import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

const publicRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/emergency/services',
  '/api/emergency/resources',
  '/api/providers',
  '/api/cron',
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  if (pathname.startsWith('/api/admin') && decoded.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin access only' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
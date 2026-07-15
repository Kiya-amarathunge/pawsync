import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

const publicRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/emergency/services',
  '/api/emergency/resources',
  '/api/forum/resources',
  '/api/providers',
  '/api/reviews',
  '/api/cron',
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Page navigation is guarded by client layouts; this proxy centralizes API security.
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

  // Specialized administrators receive only the endpoints required by their duties.
  if (pathname.startsWith('/api/admin') && decoded.adminRole && decoded.adminRole !== 'super_admin') {
    const moderationPath = pathname.startsWith('/api/admin/moderation');
    const verificationPath = pathname.startsWith('/api/admin/verifications');
    const sharedPath = pathname.startsWith('/api/admin/dashboard') || pathname.startsWith('/api/admin/audit-logs');
    const allowed = sharedPath
      || (decoded.adminRole === 'content_moderator' && moderationPath)
      || (decoded.adminRole === 'verification_specialist' && verificationPath);
    if (!allowed) return NextResponse.json({ error: 'Your administrator role does not permit this action' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};

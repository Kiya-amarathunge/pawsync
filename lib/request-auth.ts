import type { NextRequest } from 'next/server';
import { verifyToken, type TokenPayload, type UserRole } from '@/lib/jwt';

export function getRequestUser(req: NextRequest): TokenPayload | null {
  // API clients send the short-lived access token using the Bearer convention.
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
}

export function hasRole(user: TokenPayload | null, roles: UserRole[]): user is TokenPayload {
  // The type predicate lets route handlers safely access user fields after this check.
  return Boolean(user?.role && roles.includes(user.role));
}

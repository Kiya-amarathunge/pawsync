/**
 * PawSync API route: /api/admin/users
 *
 * Domain: administration, moderation, reporting, and platform oversight.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    const filter: any = {};
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ registrationDate: -1 });

    const total = await User.countDocuments(filter);

    return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin get users error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

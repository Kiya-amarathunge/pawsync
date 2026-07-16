/**
 * PawSync API route: /api/admin/audit-logs
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
import AuditLog from '@/models/AuditLog';
import { verifyToken } from '@/lib/jwt';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// GET /api/admin/audit-logs
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const actionType = searchParams.get('actionType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    const filter: any = {};
    if (actionType) filter.actionType = actionType;

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('adminId', 'name email');

    const total = await AuditLog.countDocuments(filter);

    return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

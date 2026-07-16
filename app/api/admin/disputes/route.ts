/**
 * PawSync API route: /api/admin/disputes
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
import Dispute from '@/models/Dispute';
import '@/models/Appointment';
import '@/models/User';
import { verifyToken } from '@/lib/jwt';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// GET /api/admin/disputes
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const status = req.nextUrl.searchParams.get('status');
    const validStatuses = ['open', 'under_review', 'resolved', 'dismissed'] as const;
    const filter: { status?: typeof validStatuses[number] } = {};
    if (validStatuses.includes(status as typeof validStatuses[number])) {
      filter.status = status as typeof validStatuses[number];
    }
    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('appointmentId', 'serviceType dateTime status price petId')
      .populate('openedBy', 'name email role')
      .populate('ownerId', 'name email')
      .populate('providerId', 'name email')
      .populate('resolvedBy', 'name');

    return NextResponse.json({ disputes });
  } catch (error) {
    console.error('Get disputes error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

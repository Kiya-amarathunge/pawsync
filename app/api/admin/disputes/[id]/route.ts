/**
 * PawSync API route: /api/admin/disputes/[id]
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
import { getRequestUser } from '@/lib/request-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const admin = getRequestUser(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const dispute = await Dispute.findById(id)
      .populate('appointmentId')
      .populate('openedBy', 'name email role')
      .populate('ownerId', 'name email')
      .populate('providerId', 'name email');
    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    if (dispute.status === 'open') {
      dispute.status = 'under_review';
      await dispute.save();
    }
    return NextResponse.json({ dispute });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

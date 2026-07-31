/**
 * PawSync API route: /api/admin/verifications
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
import Veterinarian from '@/models/Veterinarian';
import ServiceProvider from '@/models/ServiceProvider';
import { verifyToken } from '@/lib/jwt';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// GET /api/admin/verifications
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requestedPage = Number.parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = 20;

    // Find providers and vets pending verification
    const pendingUsers = await User.find({
      role: { $in: ['veterinarian', 'service_provider'] },
      isActive: false,
      isSuspended: false,
      verificationStatus: { $in: ['pending', 'more_info_requested'] },
    })
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ registrationDate: -1 });

    // Attach their profile details
    const withProfiles = await Promise.all(
      pendingUsers.map(async (user) => {
        let profile = null;
        if (user.role === 'veterinarian') {
          profile = await Veterinarian.findOne({ vetId: user._id });
        } else {
          profile = await ServiceProvider.findOne({ providerId: user._id });
        }
        return { ...user.toObject(), profile };
      })
    );

    const total = await User.countDocuments({
      role: { $in: ['veterinarian', 'service_provider'] },
      isActive: false,
      isSuspended: false,
      verificationStatus: { $in: ['pending', 'more_info_requested'] },
    });

    return NextResponse.json({ pendingUsers: withProfiles, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get verifications error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

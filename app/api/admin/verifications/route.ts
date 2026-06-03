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

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = 20;

    // Find providers and vets pending verification
    const pendingUsers = await User.find({
      role: { $in: ['veterinarian', 'service_provider'] },
      isVerified: true,
      isActive: false,
      isSuspended: false,
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
      isVerified: true,
      isActive: false,
    });

    return NextResponse.json({ pendingUsers: withProfiles, total, page });
  } catch (error) {
    console.error('Get verifications error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

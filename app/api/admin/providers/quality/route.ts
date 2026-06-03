import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ServiceProvider from '@/models/ServiceProvider';
import Appointment from '@/models/Appointment';
import Review from '@/models/Review';
import { verifyToken } from '@/lib/jwt';

function getAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

// GET /api/admin/providers/quality
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const providers = await ServiceProvider.find({ isVerified: true }).populate(
      'providerId',
      'name email'
    );

    const quality = await Promise.all(
      providers.map(async (provider) => {
        const [completed, cancelled, reviews] = await Promise.all([
          Appointment.countDocuments({ providerId: provider.providerId, status: 'completed' }),
          Appointment.countDocuments({ providerId: provider.providerId, status: 'cancelled' }),
          Review.find({ providerId: provider.providerId }),
        ]);

        const total = completed + cancelled;
        const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        const flagged = cancellationRate > 30 || avgRating < 2.5;

        return {
          provider: provider.toObject(),
          completed,
          cancelled,
          cancellationRate,
          avgRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length,
          flagged,
        };
      })
    );

    return NextResponse.json({ providers: quality });
  } catch (error) {
    console.error('Provider quality error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * PawSync API route: /api/providers/[id]
 *
 * Domain: provider discovery and availability.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ServiceProvider from '@/models/ServiceProvider';
import Veterinarian from '@/models/Veterinarian';
import User from '@/models/User';
import Review from '@/models/Review';

// GET /api/providers/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const providerUser = await User.findOne({
      _id: id,
      role: { $in: ['veterinarian', 'service_provider'] },
      isActive: true,
      isSuspended: false,
      verificationStatus: 'approved',
    }).select('name email phoneNumber role');
    if (!providerUser) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    const profile = providerUser.role === 'veterinarian'
      ? await Veterinarian.findOne({ vetId: id })
      : await ServiceProvider.findOne({ providerId: id });
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });

    const reviews = await Review.find({ providerId: id, isFlagged: false, removedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('ownerId', 'name');

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return NextResponse.json({
      provider: {
        ...profile.toObject(),
        providerId: providerUser,
        serviceType: providerUser.role === 'veterinarian' ? ['veterinary'] : profile.serviceType,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
        recentReviews: reviews,
      },
    });
  } catch (error) {
    console.error('Get provider error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

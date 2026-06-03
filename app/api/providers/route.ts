import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ServiceProvider from '@/models/ServiceProvider';
import User from '@/models/User';
import Review from '@/models/Review';

// GET /api/providers
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const serviceType = searchParams.get('serviceType');
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    const filter: any = { isVerified: true };
    if (serviceType) filter.serviceType = { $in: [serviceType] };

    const providers = await ServiceProvider.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('providerId', 'name email phoneNumber');

    // Add average rating to each provider
    const providersWithRating = await Promise.all(
      providers.map(async (provider) => {
        const reviews = await Review.find({ providerId: provider.providerId });
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;
        return {
          ...provider.toObject(),
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length,
        };
      })
    );

    // Filter by minimum rating
    const filtered = providersWithRating.filter((p) => p.averageRating >= minRating);
    const total = await ServiceProvider.countDocuments(filter);

    return NextResponse.json({ providers: filtered, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get providers error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ServiceProvider from '@/models/ServiceProvider';
import Review from '@/models/Review';

// GET /api/providers/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const provider = await ServiceProvider.findOne({ providerId: id }).populate(
      'providerId',
      'name email phoneNumber'
    );

    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    const reviews = await Review.find({ providerId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('ownerId', 'name');

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return NextResponse.json({
      provider: {
        ...provider.toObject(),
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
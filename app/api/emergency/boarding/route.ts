import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ServiceProvider from '@/models/ServiceProvider';

// GET /api/emergency/boarding
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const boardingProviders = await ServiceProvider.find({
      serviceType: { $in: ['boarding'] },
      isVerified: true,
    })
      .limit(10)
      .populate('providerId', 'name email phoneNumber');

    return NextResponse.json({ boarding: boardingProviders });
  } catch (error) {
    console.error('Get emergency boarding error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

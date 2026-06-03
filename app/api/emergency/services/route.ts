import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EmergencyContact from '@/models/EmergencyContact';

// GET /api/emergency/services?lat=...&lng=...
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = req.nextUrl;
    const lat = parseFloat(searchParams.get('lat') || '6.9271');
    const lng = parseFloat(searchParams.get('lng') || '79.8612');

    // Get all emergency contacts and sort by distance
    const contacts = await EmergencyContact.find({ isVerified: true });

    const withDistance = contacts.map((c) => {
      const R = 6371; // Earth radius in km
      const dLat = ((c.location.lat - lat) * Math.PI) / 180;
      const dLng = ((c.location.lng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((c.location.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...c.toObject(), distance: Math.round(distance * 10) / 10 };
    });

    withDistance.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ services: withDistance });
  } catch (error) {
    console.error('Get emergency services error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

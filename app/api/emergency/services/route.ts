/**
 * PawSync API route: /api/emergency/services
 *
 * Domain: emergency service discovery and urgent assistance.
 * Methods: GET.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EmergencyContact from '@/models/EmergencyContact';

// GET /api/emergency/services
export async function GET() {
  try {
    await connectDB();
    const contacts = await EmergencyContact.find({ isVerified: true }).sort({ isAvailable: -1, name: 1 });
    const services = contacts.map((contact) => {
      const c = contact.toObject();
      const availabilityIsFresh = c.availabilityUpdatedAt && Date.now() - c.availabilityUpdatedAt.getTime() < 30 * 60 * 1000;
      return { ...c, availabilityStatus: availabilityIsFresh ? (c.isAvailable ? 'available' : 'busy') : 'call-to-confirm' };
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Get emergency services error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

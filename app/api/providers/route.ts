/**
 * PawSync API route: /api/providers
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
import Review from '@/models/Review';
import Appointment from '@/models/Appointment';
import User from '@/models/User';
import { getRequestUser } from '@/lib/request-auth';

interface ProviderResult {
  providerId: { _id: unknown; name: string; email: string; phoneNumber?: string };
  serviceType: string[];
  specialization?: string;
  location?: { address?: string; lat?: number; lng?: number };
  pricing?: Array<{ service: string; price: number; duration: number }>;
  availability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  blockedDates?: Date[];
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const params = req.nextUrl.searchParams;
    const serviceType = params.get('serviceType') || '';
    const specialization = params.get('specialization')?.toLowerCase() || '';
    const location = params.get('location')?.toLowerCase() || '';
    const minRating = Number(params.get('minRating')) || 0;
    const maxPrice = Number(params.get('maxPrice')) || Number.POSITIVE_INFINITY;
    const availableOn = params.get('availableOn');
    const page = Math.max(1, Number(params.get('page')) || 1);
    const limit = 20;

    const requestUser = getRequestUser(req);
    const owner = requestUser?.role === 'pet_owner' ? await User.findById(requestUser.userId).select('favoriteProviders').lean() : null;
    const favorites = new Set((owner?.favoriteProviders || []).map(id => String(id)));
    const [serviceProviders, veterinarians] = await Promise.all([
      ServiceProvider.find().populate({
        path: 'providerId',
        match: { isActive: true, isSuspended: false, verificationStatus: 'approved' },
        select: 'name email phoneNumber',
      }).lean(),
      Veterinarian.find().populate({
        path: 'vetId',
        match: { isActive: true, isSuspended: false, verificationStatus: 'approved' },
        select: 'name email phoneNumber',
      }).lean(),
    ]);
    const normalized: ProviderResult[] = [
      ...serviceProviders.filter(provider => provider.providerId).map(provider => ({ ...provider, serviceType: provider.serviceType || [], providerId: provider.providerId } as ProviderResult)),
      ...veterinarians.filter(vet => vet.vetId).map(vet => ({ ...vet, businessName: `Dr. ${(vet.vetId as unknown as { name: string }).name}`, serviceType: ['veterinary'], providerId: vet.vetId } as ProviderResult)),
    ];
    // Approved accounts become discoverable only after configuring at least
    // one priced service and one availability window.
    const bookable = normalized.filter(provider =>
      Boolean(provider.availability?.length)
      && Boolean(provider.pricing?.some(price => provider.serviceType.includes(price.service))),
    );
    const withRatings = await Promise.all(bookable.map(async provider => {
      const providerId = String(provider.providerId._id);
      const providerName = provider.providerId.name;
      const providerEmail = provider.providerId.email;
      const stats = await Review.aggregate([
        { $match: { providerId: provider.providerId._id } },
        { $group: { _id: null, averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
      ]);
      const appointments = await Appointment.find({ providerId: provider.providerId._id, status: { $in: ['confirmed', 'completed', 'cancelled'] } }).select('status createdAt statusUpdatedAt').lean();
      const accepted = appointments.filter(appointment => ['confirmed', 'completed'].includes(appointment.status)).length;
      const responseSamples = appointments.filter(appointment => appointment.statusUpdatedAt).map(appointment => (new Date(appointment.statusUpdatedAt!).getTime() - new Date(appointment.createdAt).getTime()) / 60_000);
      const responseTimeMinutes = responseSamples.length ? Math.round(responseSamples.reduce((sum, value) => sum + value, 0) / responseSamples.length) : null;
      return { ...provider, providerId, providerName, providerEmail, averageRating: Math.round((stats[0]?.averageRating || 0) * 10) / 10, reviewCount: stats[0]?.reviewCount || 0, acceptanceRate: appointments.length ? Math.round(accepted / appointments.length * 100) : 100, responseTimeMinutes, isFavorite: favorites.has(providerId) };
    }));
    const day = availableOn ? new Date(`${availableOn}T00:00:00`).getDay() : null;
    const filtered = withRatings.filter(provider => {
      const services = provider.serviceType || [];
      const prices = provider.pricing || [];
      const address = provider.location?.address?.toLowerCase() || '';
      const specialty = provider.specialization?.toLowerCase() || '';
      const blocked = availableOn && provider.blockedDates?.some(date => new Date(date).toDateString() === new Date(`${availableOn}T00:00:00`).toDateString());
      return (!serviceType || services.includes(serviceType))
        && (!specialization || specialty.includes(specialization))
        && (!location || address.includes(location))
        && provider.averageRating >= minRating
        && (!Number.isFinite(maxPrice) || prices.some(price => price.price <= maxPrice))
        && (day === null || (!blocked && provider.availability?.some(slot => slot.dayOfWeek === day)));
    });
    const start = (page - 1) * limit;
    return NextResponse.json({ providers: filtered.slice(start, start + limit), total: filtered.length, page, pages: Math.ceil(filtered.length / limit) });
  } catch (error) {
    console.error('Get providers error:', error);
    return NextResponse.json({ error: 'Unable to load providers' }, { status: 500 });
  }
}

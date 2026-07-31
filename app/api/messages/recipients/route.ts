/**
 * Lists active, approved providers that a pet owner may message.
 * The optional query matches the provider name, business name, specialization,
 * role, or offered service.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import ServiceProvider from '@/models/ServiceProvider';
import Veterinarian from '@/models/Veterinarian';
import { getRequestUser, hasRole } from '@/lib/request-auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const owner = getRequestUser(req);
    if (!hasRole(owner, ['pet_owner'])) {
      return NextResponse.json({ error: 'Pet owner access required' }, { status: 403 });
    }

    const query = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
    const providers = await User.find({
      role: { $in: ['veterinarian', 'service_provider'] },
      isActive: true,
      isSuspended: false,
      verificationStatus: 'approved',
    }).select('name role').sort({ name: 1 }).limit(100).lean();

    const providerIds = providers.map(provider => provider._id);
    const [serviceProfiles, vetProfiles] = await Promise.all([
      ServiceProvider.find({ providerId: { $in: providerIds } })
        .select('providerId businessName serviceType specialization')
        .lean(),
      Veterinarian.find({ vetId: { $in: providerIds } })
        .select('vetId specialization')
        .lean(),
    ]);
    const servicesById = new Map(serviceProfiles.map(profile => [String(profile.providerId), profile]));
    const vetsById = new Map(vetProfiles.map(profile => [String(profile.vetId), profile]));

    const recipients = providers.map(provider => {
      const id = String(provider._id);
      const serviceProfile = servicesById.get(id);
      const vetProfile = vetsById.get(id);
      return {
        id,
        name: provider.name,
        role: provider.role,
        businessName: serviceProfile?.businessName || (provider.role === 'veterinarian' ? `Dr. ${provider.name}` : ''),
        specialization: serviceProfile?.specialization || vetProfile?.specialization || '',
        serviceTypes: provider.role === 'veterinarian' ? ['veterinary'] : serviceProfile?.serviceType || [],
      };
    }).filter(recipient => {
      if (!query) return true;
      return [
        recipient.name,
        recipient.businessName,
        recipient.specialization,
        recipient.role.replace('_', ' '),
        ...recipient.serviceTypes,
      ].some(value => value.toLowerCase().includes(query));
    }).slice(0, 20);

    return NextResponse.json({ recipients });
  } catch (error) {
    console.error('List message recipients error:', error);
    return NextResponse.json({ error: 'Unable to load providers' }, { status: 500 });
  }
}

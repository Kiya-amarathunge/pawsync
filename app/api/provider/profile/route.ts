/**
 * PawSync API route: /api/provider/profile
 *
 * Domain: provider profiles, dashboards, and operations.
 * Methods: GET, PUT.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import ServiceProvider from '@/models/ServiceProvider';
import Veterinarian from '@/models/Veterinarian';
import { getRequestUser, hasRole } from '@/lib/request-auth';

const serviceSchema = z.object({
  service: z.enum(['veterinary', 'grooming', 'training', 'sitting', 'boarding']),
  price: z.number().nonnegative().max(10_000_000),
  duration: z.number().int().min(15).max(480),
});

const profileSchema = z.object({
  businessName: z.string().trim().min(2).max(150).optional(),
  businessDescription: z.string().trim().max(3000).optional(),
  specialization: z.string().trim().max(500).optional(),
  credentials: z.string().trim().max(2000).optional(),
  yearsOfExperience: z.number().int().min(0).max(80).optional(),
  location: z.object({ address: z.string().trim().max(500), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() }).optional(),
  serviceType: z.array(z.enum(['veterinary', 'grooming', 'training', 'sitting', 'boarding'])).optional(),
  pricing: z.array(serviceSchema).max(30).optional(),
}).superRefine((data, context) => {
  if (!data.serviceType || !data.pricing) return;
  data.pricing.forEach((price, index) => {
    if (!data.serviceType!.includes(price.service)) {
      context.addIssue({
        code: 'custom',
        path: ['pricing', index, 'service'],
        message: `${price.service} must also be selected as a service category`,
      });
    }
  });
});

async function findProfile(userId: string, role: string) {
  return role === 'veterinarian'
    ? Veterinarian.findOne({ vetId: userId }).populate('vetId', 'name email phoneNumber')
    : ServiceProvider.findOne({ providerId: userId }).populate('providerId', 'name email phoneNumber');
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['veterinarian', 'service_provider'])) return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    const profile = await findProfile(user.userId, user.role!);
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Get provider profile error:', error);
    return NextResponse.json({ error: 'Unable to load provider profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['veterinarian', 'service_provider'])) return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    const parsed = profileSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const update = parsed.data;
    const profile = user.role === 'veterinarian'
      ? await Veterinarian.findOneAndUpdate({ vetId: user.userId }, { $set: update }, { new: true, runValidators: true })
      : await ServiceProvider.findOneAndUpdate({ providerId: user.userId }, { $set: update }, { new: true, runValidators: true });
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    return NextResponse.json({ message: 'Provider profile updated', profile });
  } catch (error) {
    console.error('Update provider profile error:', error);
    return NextResponse.json({ error: 'Unable to update provider profile' }, { status: 500 });
  }
}

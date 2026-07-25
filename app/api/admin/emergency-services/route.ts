/**
 * Admin API for listing and registering emergency clinics.
 * New clinics remain pending until an administrator explicitly approves them.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import EmergencyContact from '@/models/EmergencyContact';
import AuditLog from '@/models/AuditLog';
import { getRequestUser, hasRole } from '@/lib/request-auth';

export const emergencyServiceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  address: z.string().trim().min(5).max(500),
  phone: z.string().trim().min(7).max(30),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  is24Hours: z.boolean().default(false),
  specializations: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = getRequestUser(req);
    if (!hasRole(admin, ['admin'])) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const services = await EmergencyContact.find().sort({ isVerified: 1, name: 1 }).lean();
    return NextResponse.json({ services });
  } catch (error) {
    console.error('List emergency services error:', error);
    return NextResponse.json({ error: 'Unable to load emergency services' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = getRequestUser(req);
    if (!hasRole(admin, ['admin'])) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const parsed = emergencyServiceSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const { lat, lng, ...details } = parsed.data;
    const service = await EmergencyContact.create({
      ...details,
      location: { lat, lng },
      isVerified: false,
      isAvailable: true,
      availabilityUpdatedAt: new Date(),
    });
    await AuditLog.create({
      adminId: admin.userId,
      actionType: 'EMERGENCY_SERVICE_CREATED',
      affectedEntity: 'EmergencyContact',
      entityId: service._id,
      justification: `Registered emergency service ${service.name} for approval`,
    });
    return NextResponse.json({ message: 'Emergency service added as pending approval', service }, { status: 201 });
  } catch (error) {
    console.error('Create emergency service error:', error);
    return NextResponse.json({ error: 'Unable to add emergency service' }, { status: 500 });
  }
}

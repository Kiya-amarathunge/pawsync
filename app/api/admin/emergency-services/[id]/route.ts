/**
 * Admin API for updating, approving, and deleting an emergency clinic.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import EmergencyContact from '@/models/EmergencyContact';
import AuditLog from '@/models/AuditLog';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { emergencyServiceSchema } from '../route';

const updateSchema = emergencyServiceSchema.partial().extend({
  isVerified: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = getRequestUser(req);
    if (!hasRole(admin, ['admin'])) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const { id } = await params;
    const update: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.isAvailable !== undefined) update.availabilityUpdatedAt = new Date();
    const service = await EmergencyContact.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after', runValidators: true });
    if (!service) return NextResponse.json({ error: 'Emergency service not found' }, { status: 404 });
    await AuditLog.create({
      adminId: admin.userId,
      actionType: parsed.data.isVerified === true ? 'EMERGENCY_SERVICE_APPROVED' : 'EMERGENCY_SERVICE_UPDATED',
      affectedEntity: 'EmergencyContact',
      entityId: service._id,
      justification: `${service.name} was updated by an administrator`,
    });
    return NextResponse.json({ message: parsed.data.isVerified === true ? 'Emergency service approved' : 'Emergency service updated', service });
  } catch (error) {
    console.error('Update emergency service error:', error);
    return NextResponse.json({ error: 'Unable to update emergency service' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = getRequestUser(req);
    if (!hasRole(admin, ['admin'])) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const { id } = await params;
    const service = await EmergencyContact.findByIdAndDelete(id);
    if (!service) return NextResponse.json({ error: 'Emergency service not found' }, { status: 404 });
    await AuditLog.create({
      adminId: admin.userId,
      actionType: 'EMERGENCY_SERVICE_DELETED',
      affectedEntity: 'EmergencyContact',
      entityId: service._id,
      justification: `Removed emergency service ${service.name}`,
    });
    return NextResponse.json({ message: 'Emergency service deleted' });
  } catch (error) {
    console.error('Delete emergency service error:', error);
    return NextResponse.json({ error: 'Unable to delete emergency service' }, { status: 500 });
  }
}

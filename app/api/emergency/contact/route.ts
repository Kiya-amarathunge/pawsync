import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EmergencyContact from '@/models/EmergencyContact';
import EmergencyEvent from '@/models/EmergencyEvent';
import Pet from '@/models/Pet';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { createNotification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    await connectDB(); const user = getRequestUser(req); if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Pet owner access required' }, { status: 403 });
    const { clinicId, petId, reason, shareRecords } = await req.json(); const clinic = await EmergencyContact.findOne({ _id: clinicId, isVerified: true }); if (!clinic) return NextResponse.json({ error: 'Emergency clinic not found' }, { status: 404 });
    let recordsShared = false;
    if (petId) { const pet = await Pet.findOne({ _id: petId, ownerId: user.userId }); if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 }); if (shareRecords && clinic.linkedProviderId && !pet.sharedWith.some((grant: { veterinarianId: { toString(): string } }) => grant.veterinarianId.toString() === clinic.linkedProviderId!.toString())) { pet.sharedWith.push({ veterinarianId: clinic.linkedProviderId, grantedAt: new Date() }); await pet.save(); recordsShared = true; } }
    const event = await EmergencyEvent.create({ ownerId: user.userId, petId: petId || undefined, clinicId: clinic._id, eventType: 'clinic_contact', reason: String(reason || 'Emergency assistance requested'), recordsShared });
    if (clinic.linkedProviderId) await createNotification({ userId: clinic.linkedProviderId, type: 'EMERGENCY_CONTACT', message: `Emergency contact request received for ${reason || 'urgent pet care'}`, actionUrl: '/provider/appointments', force: true });
    return NextResponse.json({ message: 'Emergency contact logged', eventId: event._id, phone: clinic.phone, recordsShared });
  } catch (error) { console.error('Emergency contact error:', error); return NextResponse.json({ error: 'Unable to coordinate emergency contact' }, { status: 500 }); }
}

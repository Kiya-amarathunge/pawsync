import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pet from '@/models/Pet';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { getRequestUser, hasRole } from '@/lib/request-auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { vetEmail } = await req.json();
    if (!vetEmail) return NextResponse.json({ error: 'Veterinarian email is required' }, { status: 400 });
    const [pet, vet] = await Promise.all([
      Pet.findOne({ _id: id, ownerId: user.userId }),
      User.findOne({ email: String(vetEmail).toLowerCase(), role: 'veterinarian', isActive: true, isVerified: true }),
    ]);
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    if (!vet) return NextResponse.json({ error: 'Verified veterinarian not found' }, { status: 404 });
    if (!pet.sharedWith.some((grant: { veterinarianId: { toString(): string } }) => grant.veterinarianId.toString() === vet._id.toString())) {
      pet.sharedWith.push({ veterinarianId: vet._id, grantedAt: new Date() });
      await pet.save();
      await Notification.create({
        userId: vet._id,
        type: 'HEALTH_RECORD_SHARED',
        message: `${pet.name}'s owner shared health records with you`,
        isRead: false,
      });
    }
    return NextResponse.json({ message: `Health records shared with ${vet.name}` });
  } catch (error) {
    console.error('Share pet error:', error);
    return NextResponse.json({ error: 'Unable to share records' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { veterinarianId } = await req.json();
    const pet = await Pet.findOneAndUpdate(
      { _id: id, ownerId: user.userId },
      { $pull: { sharedWith: { veterinarianId } } },
      { new: true }
    );
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    return NextResponse.json({ message: 'Veterinarian access revoked' });
  } catch (error) {
    console.error('Revoke pet sharing error:', error);
    return NextResponse.json({ error: 'Unable to revoke access' }, { status: 500 });
  }
}

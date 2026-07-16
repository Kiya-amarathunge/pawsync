/**
 * PawSync API route: /api/providers/[id]/favorite
 *
 * Domain: provider discovery and availability.
 * Methods: PATCH.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getRequestUser, hasRole } from '@/lib/request-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['pet_owner'])) return NextResponse.json({ error: 'Pet owner access required' }, { status: 403 });
    const { id } = await params;
    const owner = await User.findById(user.userId).select('favoriteProviders');
    if (!owner) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const isFavorite = owner.favoriteProviders.some(providerId => providerId.toString() === id);
    await User.findByIdAndUpdate(user.userId, isFavorite ? { $pull: { favoriteProviders: id } } : { $addToSet: { favoriteProviders: id } });
    return NextResponse.json({ message: isFavorite ? 'Provider removed from favorites' : 'Provider saved to favorites', isFavorite: !isFavorite });
  } catch (error) {
    console.error('Toggle provider favorite error:', error);
    return NextResponse.json({ error: 'Unable to update favorites' }, { status: 500 });
  }
}

import Pet from '@/models/Pet';
import type { TokenPayload } from '@/lib/jwt';

export async function findAccessiblePet(petId: string, user: TokenPayload) {
  // Owners may access only their pets; vets require an explicit sharedWith entry.
  if (user.role === 'pet_owner') return Pet.findOne({ _id: petId, ownerId: user.userId });
  if (user.role === 'veterinarian') {
    return Pet.findOne({ _id: petId, 'sharedWith.veterinarianId': user.userId });
  }
  return null;
}

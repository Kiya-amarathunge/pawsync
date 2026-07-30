/**
 * PawSync API route: /api/provider/profile/credentials
 *
 * Domain: provider profiles, dashboards, and operations.
 * Methods: POST.
 *
 * Route handlers validate applicable input and access rules, perform the
 * required database or service operation, and return JSON or file responses
 * with meaningful HTTP status codes. Detailed checks remain close to the
 * relevant handler so the business rules can be reviewed in context.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import ServiceProvider from '@/models/ServiceProvider';
import Veterinarian from '@/models/Veterinarian';
import { getRequestUser, hasRole } from '@/lib/request-auth';
import { saveProviderCredential, validateUpload } from '@/lib/file-storage';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getRequestUser(req);
    if (!hasRole(user, ['veterinarian', 'service_provider'])) return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    const file = (await req.formData()).get('file');
    const fileError = validateUpload(file, ['application/pdf', 'image/jpeg', 'image/png'], 10);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
    const { storageKey } = await saveProviderCredential(file as File);
    const update = { $push: { verificationDocuments: storageKey }, $set: { isVerified: false } };
    const profile = user.role === 'veterinarian'
      ? await Veterinarian.findOneAndUpdate({ vetId: user.userId }, update, { new: true })
      : await ServiceProvider.findOneAndUpdate({ providerId: user.userId }, update, { new: true });
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    await User.findByIdAndUpdate(user.userId, {
      $set: {
        isActive: false,
        isVerified: false,
        verificationStatus: 'pending',
        verificationNote: 'A new credential was uploaded and requires administrator review.',
      },
    });
    return NextResponse.json({
      message: 'Credential uploaded. Your account is pending administrator review and you will now be signed out.',
      requiresReapproval: true,
    }, { status: 201 });
  } catch (error) {
    console.error('Upload provider credential error:', error);
    return NextResponse.json({ error: 'Unable to upload credential' }, { status: 500 });
  }
}

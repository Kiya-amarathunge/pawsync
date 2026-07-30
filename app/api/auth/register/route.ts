/**
 * PawSync API route: /api/auth/register
 *
 * Domain: account authentication and session management.
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
import Veterinarian from '@/models/Veterinarian';
import ServiceProvider from '@/models/ServiceProvider';
import { sendProviderPendingEmail } from '@/lib/mailer';
import { registerSchema } from '@/lib/validations/auth';
import { saveProviderCredential, validateUpload } from '@/lib/file-storage';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const isMultipart = req.headers.get('content-type')?.includes('multipart/form-data');
    let verificationDocument: FormDataEntryValue | null = null;
    let body: Record<string, unknown>;
    if (isMultipart) {
      const formData = await req.formData();
      let serviceType: string[] = [];
      try {
        serviceType = JSON.parse(String(formData.get('serviceType') || '[]'));
      } catch {
        serviceType = [];
      }
      verificationDocument = formData.get('verificationDocument');
      body = {
        email: String(formData.get('email') || ''),
        password: String(formData.get('password') || ''),
        name: String(formData.get('name') || ''),
        phoneNumber: String(formData.get('phoneNumber') || ''),
        role: String(formData.get('role') || ''),
        licenseNumber: String(formData.get('licenseNumber') || ''),
        specialization: String(formData.get('specialization') || ''),
        businessName: String(formData.get('businessName') || ''),
        businessRegistrationNumber: String(formData.get('businessRegistrationNumber') || ''),
        serviceType,
        acceptedTerms: String(formData.get('acceptedTerms') || '') === 'true',
      };
    } else {
      body = await req.json();
    }

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, phoneNumber, role, licenseNumber, specialization, businessName } = result.data;
    if (role !== 'pet_owner') {
      const fileError = validateUpload(verificationDocument, ['application/pdf', 'image/jpeg', 'image/png'], 10);
      if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const isActive = role === 'pet_owner';

    const storedDocument = verificationDocument instanceof File
      ? await saveProviderCredential(verificationDocument)
      : null;
    const user = await User.create({
      email,
      password,
      name,
      phoneNumber,
      role,
      isVerified: true,
      isActive,
      verificationStatus: role === 'pet_owner' ? 'approved' : 'pending',
    });
    if (role === 'veterinarian') {
      await Veterinarian.create({
        vetId: user._id,
        licenseNumber,
        businessRegistrationNumber: body.businessRegistrationNumber || '',
        specialization: specialization || '',
        isVerified: false,
        verificationDocuments: storedDocument ? [storedDocument.storageKey] : [],
        availability: [],
        blockedDates: [],
        pricing: [],
        photos: [],
      });
    }

    if (role === 'service_provider') {
      await ServiceProvider.create({
        providerId: user._id,
        businessName,
        businessRegistrationNumber: body.businessRegistrationNumber || '',
        serviceType: result.data.serviceType || [],
        isVerified: false,
        verificationDocuments: storedDocument ? [storedDocument.storageKey] : [],
        availability: [],
        blockedDates: [],
        pricing: [],
        photos: [],
      });
    }

    if (role === 'veterinarian' || role === 'service_provider') {
      void sendProviderPendingEmail(email, name).catch(error => {
        console.error('Provider application email delivery error:', error);
      });
    }

    return NextResponse.json(
      {
        message:
          role === 'pet_owner'
            ? 'Account created! You can now sign in.'
            : 'Application received! It is now visible to the admin verification team.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

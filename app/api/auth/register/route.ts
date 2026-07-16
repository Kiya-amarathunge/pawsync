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

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, phoneNumber, role, licenseNumber, specialization, businessName, serviceType } = result.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const isActive = role === 'pet_owner';

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
        verificationDocuments: [],
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
        serviceType: serviceType || [],
        isVerified: false,
        verificationDocuments: [],
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

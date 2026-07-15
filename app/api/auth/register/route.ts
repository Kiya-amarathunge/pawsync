import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Veterinarian from '@/models/Veterinarian';
import ServiceProvider from '@/models/ServiceProvider';
import { signAccessToken } from '@/lib/jwt';
import { sendVerificationEmail, sendProviderPendingEmail } from '@/lib/mailer';
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
      isVerified: false,
      isActive,
      verificationStatus: role === 'pet_owner' ? 'approved' : 'pending',
    });
if (role === 'veterinarian' && licenseNumber) {
  await Veterinarian.create({
    vetId: user._id,
    licenseNumber,
    businessRegistrationNumber: body.businessRegistrationNumber || '',
    specialization: specialization || '',
    isVerified: false,
  });
}

if (role === 'service_provider' && businessName) {
  await ServiceProvider.create({
    providerId: user._id,
    businessName,
    businessRegistrationNumber: body.businessRegistrationNumber || '',
    serviceType: serviceType || [],
    isVerified: false,
  });
}

    const token = signAccessToken({ userId: String(user._id), purpose: 'verify-email' }, '24h');
    await sendVerificationEmail(email, token);

    if (role === 'veterinarian' || role === 'service_provider') {
      await sendProviderPendingEmail(email, name);
    }

    return NextResponse.json(
      {
        message:
          role === 'pet_owner'
            ? 'Account created! Please check your email to verify your account.'
            : 'Application received! Verify your email while we review your credentials.',
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

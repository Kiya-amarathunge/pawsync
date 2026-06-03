import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { signAccessToken } from '@/lib/jwt';
import { sendPasswordResetEmail } from '@/lib/mailer';
import { forgotPasswordSchema } from '@/lib/validations/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { email } = result.data;

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with that email, you will receive a password reset link.',
      });
    }

    const token = signAccessToken({ userId: user._id, purpose: 'reset-password' });
    await sendPasswordResetEmail(email, token);

    return NextResponse.json({
      message: 'If an account exists with that email, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

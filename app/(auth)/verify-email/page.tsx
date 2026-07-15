'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0faf6, #e8f4ff)',
    }}>
      <div className="card animate-fadeIn" style={{ padding: 48, maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>
          {message === 'verified' ? '✅' : message === 'already-verified' ? '👍' : '📧'}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
          {message === 'verified' ? 'Email Verified!' :
           message === 'already-verified' ? 'Already Verified' :
           'Check Your Email'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32 }}>
          {message === 'verified'
            ? 'Your email has been verified successfully. You can now log in to your PawSync account.'
            : message === 'already-verified'
            ? 'Your email was already verified. You can log in to your account.'
            : 'We sent a verification link to your email address. Click the link in the email to activate your account.'}
        </p>
        <Link href="/login" className="btn btn-primary btn-lg btn-full">
          Go to Login →
        </Link>
        {!message && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>
            Didn't receive the email? Check your spam folder or{' '}
            <Link href="/register" style={{ color: 'var(--primary)' }}>try registering again</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

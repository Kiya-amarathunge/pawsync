'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmailSent(true);
      showToast('Password reset email sent!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Password reset successfully!', 'success');
      router.push('/login');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0faf6, #e8f4ff)', padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }} className="animate-fadeIn">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>{token ? 'Set New Password' : 'Forgot Password?'}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            {token ? 'Enter your new password below' : 'Enter your email and we\'ll send you a reset link'}
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {emailSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                We sent a password reset link to <strong>{email}</strong>
              </p>
              <Link href="/login" className="btn btn-primary btn-full">Back to Login</Link>
            </div>
          ) : token ? (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input className="input" type="password" placeholder="Min 8 chars with letters and numbers" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Confirm New Password</label>
                <input className="input" type="password" placeholder="Repeat your new password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isLoading}>
                {isLoading ? <><div className="spinner" />Resetting...</> : 'Reset Password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isLoading}>
                {isLoading ? <><div className="spinner" />Sending...</> : 'Send Reset Link →'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          Remember your password?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
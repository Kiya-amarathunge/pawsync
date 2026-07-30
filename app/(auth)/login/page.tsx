'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CalendarCheck, ClipboardCheck, Eye, EyeOff, PawPrint, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      showToast('Welcome back', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return <main className="auth-shell">
    <section className="auth-context" aria-label="About PawSync">
      <div className="auth-brand"><span><PawPrint size={20} /></span>PawSync</div>
      <div className="auth-context-copy">
        <p className="auth-eyebrow">Pet care workspace</p>
        <h1>Care coordination, without the paperwork.</h1>
        <p>Keep appointments, health records and provider conversations organized in one secure place.</p>
        <div className="auth-benefits">
          <div><CalendarCheck size={19} /><span><strong>One care schedule</strong><small>Appointments and reminders stay together.</small></span></div>
          <div><ClipboardCheck size={19} /><span><strong>Complete health history</strong><small>Records are available when care teams need them.</small></span></div>
          <div><ShieldCheck size={19} /><span><strong>Controlled access</strong><small>You decide who can view sensitive pet information.</small></span></div>
        </div>
      </div>
      <p className="auth-context-footer">PawSync care management</p>
    </section>

    <section className="auth-form-panel">
      <div className="auth-form-wrap">
        <div className="auth-mobile-brand"><PawPrint size={19} /> PawSync</div>
        <header className="auth-form-header"><p>Welcome back</p><h2>Sign in to your account</h2><span>Enter your account details to continue.</span></header>
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="input-group"><span className="input-label">Email address</span><input className="input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required /></label>
          <label className="input-group"><span className="input-label">Password</span><span className="password-input"><input className="input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          <div className="auth-form-meta"><Link href="/support">Need help?</Link><Link href="/reset-password">Forgot password?</Link></div>
          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={isLoading}>{isLoading ? <><span className="spinner" /> Signing in</> : 'Sign in'}</button>


        </form>
        <p className="auth-switch">New to PawSync? <Link href="/register">Create an account</Link></p>
        <p style={{ marginTop: 14, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}><Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link> · <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link></p>
      </div>
    </section>
  </main>;
}

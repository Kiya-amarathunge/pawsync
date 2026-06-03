'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      showToast('Welcome back!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #f0faf6 0%, #e8f4ff 50%, #fff8f5 100%)',
    }}>
      {/* Left side — branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        background: 'linear-gradient(135deg, var(--primary) 0%, #157a5a 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }} className="hidden md:flex">
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', bottom: -50, left: -50,
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>🐾</div>
          <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16, lineHeight: 1.1 }}>
            Your pet deserves<br />the best care
          </h1>
          <p style={{ fontSize: 18, opacity: 0.85, lineHeight: 1.7, maxWidth: 400 }}>
            Connect with veterinarians, groomers, trainers and track your pet's health — all in one beautiful platform.
          </p>

          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['🏥 Book vet appointments instantly', '📋 Track health records & vaccinations', '💬 Chat with service providers', '🚨 Emergency services at your fingertips'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, opacity: 0.9 }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div style={{
        width: '100%',
        maxWidth: 520,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 48px',
        background: 'white',
      }}>
        <div className="animate-fadeIn">
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <span style={{ fontSize: 28 }}>🐾</span>
              <span style={{ fontFamily: 'Clash Display', fontSize: 22, fontWeight: 700 }}>PawSync</span>
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Welcome back</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Sign in to manage your pet's care
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)',
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Link href="/reset-password" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={isLoading}>
              {isLoading ? <><div className="spinner" />Signing in...</> : 'Sign In →'}
            </button>
          </form>

          <div className="divider" style={{ margin: '28px 0' }} />

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
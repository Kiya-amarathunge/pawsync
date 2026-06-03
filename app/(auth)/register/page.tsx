'use client';
import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const roles = [
  { value: 'pet_owner', label: 'Pet Owner', icon: '🐶', desc: 'Book services and track your pet\'s health' },
  { value: 'veterinarian', label: 'Veterinarian', icon: '🏥', desc: 'Offer consultations and manage patients' },
  { value: 'service_provider', label: 'Service Provider', icon: '✂️', desc: 'Grooming, training, boarding and more' },
];

export default function RegisterPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    role: '', name: '', email: '', password: '', phoneNumber: '',
    licenseNumber: '', specialization: '', businessRegistrationNumber: '',
    businessName: '', serviceType: [] as string[],
  });

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message, 'success');
      router.push('/login');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedStep2 = form.name && form.email && form.password && form.phoneNumber;
  const canProceedStep3 =
    form.role === 'pet_owner' ? true :
    form.role === 'veterinarian' ? !!(form.licenseNumber && form.businessRegistrationNumber) :
    !!(form.businessName && form.businessRegistrationNumber);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0faf6 0%, #e8f4ff 50%, #fff8f5 100%)',
      padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 580 }} className="animate-fadeIn">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🐾</div>
          <h1 style={{ fontSize: 32, fontWeight: 700 }}>Join PawSync</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Create your account in minutes</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {['Choose Role', 'Personal Info', 'Professional Details'].map((label, idx) => {
            const s = idx + 1;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                    background: s <= step ? 'var(--primary)' : 'var(--border)',
                    color: s <= step ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.3s ease',
                  }}>{s < step ? '✓' : s}</div>
                  <span style={{ fontSize: 10, color: s <= step ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {s < 3 && <div style={{ width: 50, height: 2, background: s < step ? 'var(--primary)' : 'var(--border)', transition: 'all 0.3s ease', marginBottom: 16 }} />}
              </div>
            );
          })}
        </div>

        <div className="card" style={{ padding: 32 }}>

          {/* Step 1 — Role */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>I am a...</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>Choose your account type to get started</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {roles.map(role => (
                  <div
                    key={role.value}
                    onClick={() => update('role', role.value)}
                    style={{
                      padding: '18px 20px', borderRadius: 'var(--radius-md)',
                      border: `2px solid ${form.role === role.value ? 'var(--primary)' : 'var(--border)'}`,
                      background: form.role === role.value ? 'var(--primary-light)' : 'white',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{role.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 15 }}>{role.label}</p>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{role.desc}</p>
                    </div>
                    {form.role === role.value && (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>✓</div>
                    )}
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-full" style={{ marginTop: 24 }} onClick={() => form.role && setStep(2)} disabled={!form.role}>
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 — Personal info */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Your details</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>Tell us about yourself</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Full Name *</label>
                    <input className="input" placeholder="John Smith" value={form.name} onChange={e => update('name', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Phone Number *</label>
                    <input className="input" placeholder="+94771234567" value={form.phoneNumber} onChange={e => update('phoneNumber', e.target.value)} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Email Address *</label>
                  <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Password *</label>
                  <input className="input" type="password" placeholder="Min 8 characters with letters and numbers" value={form.password} onChange={e => update('password', e.target.value)} />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Must contain at least one letter and one number</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => canProceedStep2 && setStep(3)} disabled={!canProceedStep2}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Role specific */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                {form.role === 'veterinarian' ? '🏥 Professional Details' :
                 form.role === 'service_provider' ? '🏢 Business Details' : '🎉 Almost Done!'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                {form.role === 'pet_owner'
                  ? 'Your account is ready to be created. Check your email after signing up!'
                  : 'These details will be verified by our admin team before your account is activated.'}
              </p>

              {form.role === 'veterinarian' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="input-group">
                    <label className="input-label">Veterinary License Number *</label>
                    <input className="input" placeholder="e.g. VET-LK-123456" value={form.licenseNumber} onChange={e => update('licenseNumber', e.target.value)} />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Your official Sri Lanka Veterinary Association license number</p>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Business Registration Number *</label>
                    <input className="input" placeholder="e.g. BR-2024-001234" value={form.businessRegistrationNumber} onChange={e => update('businessRegistrationNumber', e.target.value)} />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Your clinic or practice registration number issued by the government</p>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Specialization</label>
                    <input className="input" placeholder="e.g. General Practice, Surgery, Dermatology" value={form.specialization} onChange={e => update('specialization', e.target.value)} />
                  </div>
                  <div style={{ padding: '14px', background: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>
                    ⚠️ Your account will be reviewed by our admin team within 2-3 business days. You'll receive an email once approved.
                  </div>
                </div>
              )}

              {form.role === 'service_provider' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="input-group">
                    <label className="input-label">Business Name *</label>
                    <input className="input" placeholder="e.g. Paws Grooming Studio" value={form.businessName} onChange={e => update('businessName', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Business Registration Number *</label>
                    <input className="input" placeholder="e.g. BR-2024-001234" value={form.businessRegistrationNumber} onChange={e => update('businessRegistrationNumber', e.target.value)} />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Your official business registration number from the Registrar of Companies</p>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Services Offered *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {['grooming', 'training', 'boarding', 'sitting'].map(type => (
                        <div
                          key={type}
                          onClick={() => {
                            const current = form.serviceType;
                            update('serviceType', current.includes(type) ? current.filter(t => t !== type) : [...current, type]);
                          }}
                          style={{
                            padding: '8px 16px', borderRadius: 'var(--radius-full)',
                            border: `1.5px solid ${form.serviceType.includes(type) ? 'var(--primary)' : 'var(--border)'}`,
                            background: form.serviceType.includes(type) ? 'var(--primary-light)' : 'white',
                            color: form.serviceType.includes(type) ? 'var(--primary)' : 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: 13, fontWeight: 500, textTransform: 'capitalize',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {form.serviceType.includes(type) ? '✓ ' : ''}{type}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: '14px', background: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>
                    ⚠️ Your account will be reviewed by our admin team within 2-3 business days. You'll receive an email once approved.
                  </div>
                </div>
              )}

              {form.role === 'pet_owner' && (
                <div style={{ padding: '20px', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(29,158,117,0.2)' }}>
                  <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 15 }}>📋 Account Summary</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
                    <p>👤 Name: <strong style={{ color: 'var(--text-primary)' }}>{form.name}</strong></p>
                    <p>📧 Email: <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong></p>
                    <p>📱 Phone: <strong style={{ color: 'var(--text-primary)' }}>{form.phoneNumber}</strong></p>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--primary)', marginTop: 12, fontWeight: 500 }}>
                    ✉️ A verification email will be sent to {form.email}. Click the link to activate your account.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={isLoading || !canProceedStep3}>
                  {isLoading ? <><div className="spinner" />Creating account...</> : 'Create Account 🐾'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
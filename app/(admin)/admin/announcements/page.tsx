'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AnnouncementsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    title: '', message: '', affectedArea: '',
    targetRoles: [] as string[], sendSMSAlert: false, isAlert: false,
  });
  const [isSending, setIsSending] = useState(false);

  const roleOptions = [
    { value: 'pet_owner', label: 'Pet Owners' },
    { value: 'veterinarian', label: 'Veterinarians' },
    { value: 'service_provider', label: 'Service Providers' },
  ];

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  const handleSend = async (isAlert: boolean) => {
    if (!form.title || !form.message) {
      showToast('Title and message are required', 'error');
      return;
    }
    setIsSending(true);
    try {
      const endpoint = isAlert ? '/api/admin/alerts' : '/api/admin/announcements';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          targetRoles: form.targetRoles.length > 0 ? form.targetRoles : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`${isAlert ? 'Alert' : 'Announcement'} sent to ${data.notificationsSent || 0} users!`, 'success');
      setForm({ title: '', message: '', affectedArea: '', targetRoles: [], sendSMSAlert: false, isAlert: false });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Announcements & Alerts</h1>
          <p className="page-subtitle">Send platform-wide messages and health alerts to users</p>
        </div>

        <div className="grid-2" style={{ alignItems: 'flex-start' }}>
          {/* Announcement form */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📢 New Announcement</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Title *</label>
                <input className="input" placeholder="e.g. Platform Maintenance Notice" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Message *</label>
                <textarea className="input" rows={4} placeholder="Write your announcement message..." value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div className="input-group">
                <label className="input-label">Target Roles (leave empty for all)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {roleOptions.map(role => (
                    <div
                      key={role.value}
                      onClick={() => toggleRole(role.value)}
                      style={{
                        padding: '6px 14px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                        border: `1.5px solid ${form.targetRoles.includes(role.value) ? 'var(--primary)' : 'var(--border)'}`,
                        background: form.targetRoles.includes(role.value) ? 'var(--primary-light)' : 'white',
                        color: form.targetRoles.includes(role.value) ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: 13, fontWeight: 500, transition: 'all 0.15s ease',
                      }}
                    >
                      {role.label}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                <input type="checkbox" id="sms" checked={form.sendSMSAlert} onChange={e => setForm(p => ({ ...p, sendSMSAlert: e.target.checked }))} />
                <label htmlFor="sms" style={{ fontSize: 14, cursor: 'pointer' }}>Also send SMS notification (Twilio)</label>
              </div>
              <button className="btn btn-primary btn-full" onClick={() => handleSend(false)} disabled={isSending}>
                {isSending ? <><div className="spinner" />Sending...</> : '📢 Send Announcement'}
              </button>
            </div>
          </div>

          {/* Health alert form */}
          <div className="card" style={{ padding: 24, border: '1px solid rgba(220,38,38,0.2)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#dc2626' }}>🚨 Seasonal Health Alert</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Send urgent disease outbreak or health warnings to pet owners in affected areas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Alert Title *</label>
                <input className="input" placeholder="e.g. Canine Parvovirus Outbreak Warning" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Alert Details *</label>
                <textarea className="input" rows={4} placeholder="Describe the health alert, symptoms to watch for, and recommended actions..." value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div className="input-group">
                <label className="input-label">Affected Area</label>
                <input className="input" placeholder="e.g. Colombo, Western Province" value={form.affectedArea} onChange={e => setForm(p => ({ ...p, affectedArea: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: '#fee2e2', borderRadius: 'var(--radius-md)' }}>
                <input type="checkbox" id="smsAlert" checked={form.sendSMSAlert} onChange={e => setForm(p => ({ ...p, sendSMSAlert: e.target.checked }))} />
                <label htmlFor="smsAlert" style={{ fontSize: 14, cursor: 'pointer', color: '#dc2626', fontWeight: 500 }}>Send urgent SMS to all pet owners (Twilio)</label>
              </div>
              <button
                style={{ background: '#dc2626', color: 'white', border: 'none', padding: '12px 20px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => handleSend(true)}
                disabled={isSending}
              >
                {isSending ? <><div className="spinner" />Sending...</> : '🚨 Send Health Alert'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
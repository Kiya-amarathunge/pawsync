'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileQuestion, ShieldCheck, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface PendingUser {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: string;
  isVerified: boolean;
  profile?: {
    licenseNumber?: string;
    businessName?: string;
    businessRegistrationNumber?: string;
    serviceType?: string[];
    specialization?: string;
    credentials?: string;
    verificationDocuments?: string[];
  };
}

export default function VerificationsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    const response = await fetch('/api/admin/verifications', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    setPending(data.pendingUsers || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const action = async (id: string, type: 'approve' | 'reject') => {
    const reason = type === 'reject' ? prompt('Reason for rejection') : undefined;
    if (type === 'reject' && !reason) return;
    const response = await fetch(`/api/admin/verifications/${id}/${type}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) await load();
  };

  const requestInfo = async (id: string) => {
    const note = prompt('What additional information is required?');
    if (!note) return;
    const response = await fetch(`/api/admin/verifications/${id}/request-info`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note }),
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) await load();
  };

  const download = async (id: string, document: string) => {
    const response = await fetch(`/api/admin/verifications/${id}/credentials/${encodeURIComponent(document)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return showToast('Unable to download credential', 'error');
    const url = URL.createObjectURL(await response.blob());
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = document;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <DashboardLayout>
    <div style={{ marginBottom: 20 }}><h1 className="page-title">Provider verification</h1><p className="page-subtitle">Review veterinarian and service-provider applications</p></div>
    {loading ? <div className="skeleton" style={{ height: 120 }} /> : <div style={{ display: 'grid', gap: 12 }}>
      {pending.map(user => <article className="card" key={user._id} style={{ padding: 19 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div><h2 style={{ fontSize: 16 }}>{user.name}</h2><p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{user.email} · {user.phoneNumber || 'No phone'}</p><div style={{ display: 'flex', gap: 6, marginTop: 6 }}><span className="badge badge-orange">{user.role.replace('_', ' ')}</span><span className="badge badge-gray">Admin review pending</span></div></div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}><button className="btn btn-primary btn-sm" disabled={!user.profile} onClick={() => void action(user._id, 'approve')}><ShieldCheck size={15} /> Approve</button><button className="btn btn-secondary btn-sm" onClick={() => void requestInfo(user._id)}><FileQuestion size={15} /> Request info</button><button className="btn btn-danger btn-sm" onClick={() => void action(user._id, 'reject')}><X size={15} /> Reject</button></div>
        </div>
        {user.profile ? <div style={{ padding: 12, background: 'var(--surface)', marginTop: 12, display: 'grid', gap: 4, fontSize: 13 }}>
          <p><strong>License/business:</strong> {user.profile.licenseNumber || user.profile.businessName || 'Not supplied'}</p>
          {user.profile.businessRegistrationNumber && <p><strong>Registration:</strong> {user.profile.businessRegistrationNumber}</p>}
          {user.profile.serviceType?.length ? <p><strong>Services:</strong> {user.profile.serviceType.join(', ')}</p> : <p><strong>Specialization:</strong> {user.profile.specialization || 'Not supplied'}</p>}
          <p><strong>Qualifications:</strong> {user.profile.credentials || 'Not supplied'}</p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>{user.profile.verificationDocuments?.map(document => <button key={document} className="btn btn-secondary btn-sm" onClick={() => void download(user._id, document)}><Download size={14} /> Credential</button>)}</div>
        </div> : <div style={{ marginTop: 12, padding: 12, background: '#fff7ed', color: '#9a3412', fontSize: 12 }}>Professional profile missing. This legacy account must be repaired before approval.</div>}
      </article>)}
      {pending.length === 0 && <div className="empty-state"><p>No pending provider applications.</p></div>}
    </div>}
  </DashboardLayout>;
}

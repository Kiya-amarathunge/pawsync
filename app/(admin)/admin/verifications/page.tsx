'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileQuestion, ShieldCheck, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import ActionDialog from '@/components/ui/ActionDialog';
import Pagination from '@/components/ui/Pagination';

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
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingAction, setPendingAction] = useState<{ id: string; type: 'reject' | 'request-info' } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const response = await fetch(`/api/admin/verifications?page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    setPending(data.pendingUsers || []);
    setTotal(data.total || 0);
    setPages(Math.max(1, data.pages || 1));
    setLoading(false);
  }, [page, token]);

  useEffect(() => { void load(); }, [load]);

  const action = async (id: string, type: 'approve' | 'reject') => {
    if (type === 'reject') { setPendingAction({ id, type: 'reject' }); return; }
    const response = await fetch(`/api/admin/verifications/${id}/${type}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) await load();
  };

  const requestInfo = async (id: string) => {
    setPendingAction({ id, type: 'request-info' });
  };

  const submitPendingAction = async (reason: string) => {
    if (!pendingAction) return;
    const endpoint = pendingAction.type === 'reject' ? 'reject' : 'request-info';
    const response = await fetch(`/api/admin/verifications/${pendingAction.id}/${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(pendingAction.type === 'reject' ? { reason } : { note: reason }),
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) { setPendingAction(null); await load(); }
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
    {loading ? <div className="skeleton" style={{ height: 120 }} /> : <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'grid', gap: 12, padding: pending.length ? 12 : 0 }}>
      {pending.map(user => <article key={user._id} style={{ padding: 19, border: '1px solid var(--border)', borderRadius: 8 }}>
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
      </div>
      <Pagination page={page} pages={pages} total={total} itemLabel="applications" onPageChange={setPage} />
    </div>}
    <ActionDialog open={Boolean(pendingAction)} title={pendingAction?.type === 'reject' ? 'Reject provider application' : 'Request more information'} description={pendingAction?.type === 'reject' ? 'The applicant will remain unable to offer services. Give a clear reason they can understand.' : 'Explain exactly which evidence or information the applicant must provide.'} confirmLabel={pendingAction?.type === 'reject' ? 'Reject application' : 'Send request'} reasonLabel={pendingAction?.type === 'reject' ? 'Reason for rejection' : 'Information required'} reasonPlaceholder="Enter a clear, professional explanation" minLength={10} danger={pendingAction?.type === 'reject'} onCancel={() => setPendingAction(null)} onConfirm={submitPendingAction} />
  </DashboardLayout>;
}

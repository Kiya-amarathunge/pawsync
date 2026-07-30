'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Dispute {
  _id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  resolution?: string;
  createdAt: string;
  openedBy?: { name: string; email: string; role: string };
  ownerId?: { name: string; email: string };
  providerId?: { name: string; email: string };
  appointmentId?: { serviceType: string; dateTime: string; status: string; price: number };
}

const statusClass: Record<string, string> = {
  open: 'badge-orange',
  under_review: 'badge-blue',
  resolved: 'badge-green',
  dismissed: 'badge-gray',
};

export default function AdminDisputesPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [status, setStatus] = useState('open');
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState<'mediate' | 'cancel' | 'refund' | 'dismiss'>('mediate');
  const [refundAmount, setRefundAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const response = await fetch(`/api/admin/disputes?status=${status}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) showToast(data.error || 'Unable to load disputes', 'error');
    setDisputes(response.ok ? data.disputes || [] : []);
    setSelected(current => current && data.disputes?.some((item: Dispute) => item._id === current._id) ? current : null);
    setLoading(false);
  }, [showToast, status, token]);

  useEffect(() => { void load(); }, [load]);

  const choose = async (dispute: Dispute) => {
    setSelected(dispute);
    setResolution(dispute.resolution || '');
    setAction('mediate');
    setRefundAmount('');
    if (dispute.status === 'open') {
      await fetch(`/api/admin/disputes/${dispute._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDisputes(current => current.map(item => item._id === dispute._id ? { ...item, status: 'under_review' } : item));
      setSelected({ ...dispute, status: 'under_review' });
    }
  };

  const resolve = async () => {
    if (!selected || !resolution.trim()) return showToast('Enter a resolution decision', 'error');
    setResolving(true);
    const response = await fetch(`/api/admin/disputes/${selected._id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        resolution: resolution.trim(),
        notifyOwner: true,
        notifyProvider: true,
        action,
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
      }),
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) {
      setSelected(null);
      setResolution('');
      await load();
    }
    setResolving(false);
  };

  return <DashboardLayout>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
      <div><h1 className="page-title">Disputes</h1><p className="page-subtitle">Review and resolve appointment-related complaints</p></div>
      <select className="input" style={{ maxWidth: 170 }} value={status} onChange={event => setStatus(event.target.value)}><option value="open">Open</option><option value="under_review">Under review</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option><option value="all">All cases</option></select>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(340px, 1.1fr)', gap: 18, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 10 }}>
        {loading ? <div className="skeleton" style={{ height: 110 }} /> : disputes.map(dispute => <button key={dispute._id} className="card" onClick={() => void choose(dispute)} style={{ padding: 16, textAlign: 'left', cursor: 'pointer', borderColor: selected?._id === dispute._id ? 'var(--primary)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{dispute.category.replace('_', ' ')}</span><span className={`badge ${statusClass[dispute.status] || 'badge-gray'}`}>{dispute.status.replace('_', ' ')}</span></div>
          <strong style={{ display: 'block', marginTop: 9 }}>{dispute.subject}</strong>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{dispute.openedBy?.name || 'User'} · {new Date(dispute.createdAt).toLocaleDateString()}</p>
        </button>)}
        {!loading && disputes.length === 0 && <div className="empty-state"><p>No {status === 'all' ? '' : status.replace('_', ' ')} disputes.</p></div>}
      </div>

      {selected ? <section className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><h2 style={{ fontSize: 18 }}>{selected.subject}</h2><p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3 }}>Opened by {selected.openedBy?.name} ({selected.openedBy?.role?.replace('_', ' ')})</p></div><span className={`badge ${statusClass[selected.status] || 'badge-gray'}`}>{selected.status.replace('_', ' ')}</span></div>
        <p style={{ marginTop: 15, lineHeight: 1.6 }}>{selected.description}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 16 }}>
          {[['Owner', selected.ownerId?.name, selected.ownerId?.email], ['Provider', selected.providerId?.name, selected.providerId?.email], ['Service', selected.appointmentId?.serviceType, selected.appointmentId?.status], ['Appointment', selected.appointmentId?.dateTime ? new Date(selected.appointmentId.dateTime).toLocaleString() : '', `Rs. ${(selected.appointmentId?.price || 0).toLocaleString()}`]].map(([label, primary, secondary]) => <div key={label} style={{ padding: 11, background: 'var(--surface)' }}><p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{label}</p><strong style={{ fontSize: 13, textTransform: 'capitalize' }}>{primary || 'Not available'}</strong>{secondary && <p style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{secondary}</p>}</div>)}
        </div>
        {['resolved', 'dismissed'].includes(selected.status) ? <div style={{ marginTop: 16, padding: 13, background: 'var(--primary-light)', borderLeft: '3px solid var(--primary)' }}><strong>Resolution</strong><p style={{ marginTop: 5 }}>{selected.resolution}</p></div> : <div style={{ display: 'grid', gap: 10, marginTop: 17 }}>
          <label className="input-group"><span className="input-label">Resolution action</span><select className="input" value={action} onChange={event => setAction(event.target.value as typeof action)}><option value="mediate">Mediation only</option><option value="cancel">Cancel appointment</option><option value="refund">Record refund recommendation</option><option value="dismiss">Dismiss complaint</option></select></label>
          {action === 'refund' && <><label className="input-group"><span className="input-label">Recommended refund amount</span><input className="input" type="number" min="0" max={selected.appointmentId?.price || undefined} value={refundAmount} onChange={event => setRefundAmount(event.target.value)} required /></label><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>This creates an approval record only. PawSync does not transfer money.</p></>}
          <label className="input-group"><span className="input-label">Resolution decision</span><textarea className="input" rows={5} value={resolution} onChange={event => setResolution(event.target.value)} placeholder="Explain the decision and any action taken" /></label>
          <button className="btn btn-primary" disabled={resolving} onClick={() => void resolve()}>{resolving ? 'Resolving...' : action === 'dismiss' ? 'Dismiss dispute' : 'Resolve dispute'}</button>
        </div>}
      </section> : <div className="empty-state"><p>Select a dispute to review its details.</p></div>}
    </div>
  </DashboardLayout>;
}

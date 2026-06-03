'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function DisputesPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/disputes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setDisputes(data.disputes || []); setIsLoading(false); });
  }, [token]);

  const handleResolve = async () => {
    if (!resolution.trim()) { showToast('Please enter a resolution', 'error'); return; }
    setIsResolving(true);
    try {
      const res = await fetch(`/api/admin/disputes/${selected._id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resolution, notifyOwner: true, notifyProvider: true }),
      });
      if (!res.ok) throw new Error('Failed to resolve');
      showToast('Dispute resolved!', 'success');
      setSelected(null);
      setResolution('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Disputes</h1>
          <p className="page-subtitle">Resolve user-provider conflicts</p>
        </div>

        <div className="grid-2" style={{ alignItems: 'flex-start' }}>
          <div>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
              </div>
            ) : disputes.length === 0 ? (
              <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚖️</div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>No disputes</h2>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {disputes.map(dispute => (
                  <div
                    key={dispute._id}
                    onClick={() => setSelected(dispute)}
                    className="card"
                    style={{
                      padding: 16, cursor: 'pointer',
                      border: selected?._id === dispute._id ? '2px solid var(--primary)' : '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{dispute.serviceType} Appointment</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {dispute.ownerId?.name} ↔ {dispute.providerId?.name}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(dispute.dateTime).toLocaleDateString()}</p>
                      </div>
                      <span className="badge badge-red">cancelled</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Resolve Dispute</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {[
                  ['Owner', selected.ownerId?.name, selected.ownerId?.email],
                  ['Provider', selected.providerId?.name, selected.providerId?.email],
                  ['Service', selected.serviceType, ''],
                  ['Date', new Date(selected.dateTime).toLocaleDateString(), ''],
                ].map(([label, val1, val2]) => (
                  <div key={label as string} style={{ padding: '10px', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{val1}</p>
                    {val2 && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{val2}</p>}
                  </div>
                ))}
              </div>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="input-label">Resolution Decision</label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Describe the resolution and any actions taken..."
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleResolve} disabled={isResolving}>
                  {isResolving ? <><div className="spinner" />Resolving...</> : 'Resolve ⚖️'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
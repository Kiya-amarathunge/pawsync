'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function VerificationsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [pending, setPending] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPending = async () => {
    if (!token) return;
    const res = await fetch('/api/admin/verifications', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setPending(data.pendingUsers || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchPending(); }, [token]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/verifications/${id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: action === 'reject' ? 'Application does not meet requirements' : undefined }),
      });
      if (!res.ok) throw new Error('Action failed');
      showToast(`Provider ${action}ed successfully`, 'success');
      fetchPending();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Provider Verifications</h1>
          <p className="page-subtitle">Review and approve service provider applications</p>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>All caught up!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>No pending verifications</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map(user => (
              <div key={user._id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{user.name?.[0]}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{user.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.email} • {user.phoneNumber}</p>
                    <span className="badge badge-orange" style={{ marginTop: 4, textTransform: 'capitalize' }}>{user.role.replace('_', ' ')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => handleAction(user._id, 'approve')}>✓ Approve</button>
                    <button className="btn btn-danger" onClick={() => handleAction(user._id, 'reject')}>✕ Reject</button>
                  </div>
                </div>
                {user.profile && (
                  <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {user.profile.licenseNumber && <p>🪪 License: {user.profile.licenseNumber}</p>}
                    {user.profile.specialization && <p>🔬 Specialization: {user.profile.specialization}</p>}
                    {user.profile.businessName && <p>🏢 Business: {user.profile.businessName}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
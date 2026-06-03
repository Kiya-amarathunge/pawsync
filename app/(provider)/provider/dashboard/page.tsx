'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ProviderDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/provider/dashboard/stats', { headers }).then(r => r.json()),
      fetch('/api/appointments?status=pending', { headers }).then(r => r.json()),
    ]).then(([statsData, apptData]) => {
      setStats(statsData);
      setAppointments(apptData.appointments || []);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [token]);

  const statCards = stats ? [
    { label: "Today's Appointments", value: stats.todayAppointments, icon: '📅', color: 'var(--blue)', bg: 'var(--blue-light)' },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: '⏳', color: 'var(--accent)', bg: 'var(--accent-light)' },
    { label: 'Week Revenue', value: `Rs. ${(stats.weekRevenue || 0).toLocaleString()}`, icon: '💰', color: 'var(--primary)', bg: 'var(--primary-light)' },
    { label: 'Average Rating', value: `${stats.averageRating || 0} ⭐`, icon: '⭐', color: '#f59e0b', bg: '#fffbeb' },
  ] : [];

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Provider Dashboard</h1>
          <p className="page-subtitle">Manage your services and appointments</p>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {isLoading ? (
            [1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)
          ) : (
            statCards.map(stat => (
              <div key={stat.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {stat.icon}
                </div>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{stat.label}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pending requests */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Pending Booking Requests</h2>
          {appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p className="empty-state-title">No pending requests</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {appointments.map(appt => (
                <div key={appt._id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{appt.serviceType}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {new Date(appt.dateTime).toLocaleDateString()} at {new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="badge badge-orange">pending</span>
                  <AcceptRejectButtons appointmentId={appt._id} token={token!} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function AcceptRejectButtons({ appointmentId, token }: { appointmentId: string; token: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState('');

  const updateStatus = async (status: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      setDone(status);
    } finally {
      setIsLoading(false);
    }
  };

  if (done) return <span className={`badge ${done === 'confirmed' ? 'badge-green' : 'badge-red'}`}>{done}</span>;

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn btn-secondary btn-sm" onClick={() => updateStatus('confirmed')} disabled={isLoading}>Accept</button>
      <button className="btn btn-danger btn-sm" onClick={() => updateStatus('cancelled')} disabled={isLoading}>Decline</button>
    </div>
  );
}
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ProviderAppointmentsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchAppointments = async () => {
    if (!token) return;
    const res = await fetch('/api/appointments', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setAppointments(data.appointments || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [token]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      showToast(`Appointment ${status}`, 'success');
      fetchAppointments();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const tabs = ['pending', 'confirmed', 'completed', 'cancelled'];
  const filtered = appointments.filter(a => a.status === activeTab);

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Manage your booking requests</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content', marginBottom: 24 }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === tab ? 'white' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                fontSize: 13,
                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize',
              }}
            >
              {tab} ({appointments.filter(a => a.status === tab).length})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>No {activeTab} appointments</h2>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(appt => (
              <div key={appt._id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, textTransform: 'capitalize' }}>{appt.serviceType}</h3>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    📅 {new Date(appt.dateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {appt.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>📝 {appt.notes}</p>}
                </div>
                {appt.price && <p style={{ fontWeight: 700, color: 'var(--primary)' }}>Rs. {appt.price.toLocaleString()}</p>}
                {activeTab === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(appt._id, 'confirmed')}>Accept</button>
                    <button className="btn btn-danger btn-sm" onClick={() => updateStatus(appt._id, 'cancelled')}>Decline</button>
                  </div>
                )}
                {activeTab === 'confirmed' && (
                  <button className="btn btn-primary btn-sm" onClick={() => updateStatus(appt._id, 'completed')}>Mark Complete</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
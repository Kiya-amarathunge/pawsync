'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';

export default function ClientsPage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/appointments', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setAppointments(data.appointments || []);
        setIsLoading(false);
      });
  }, [token]);

  // Group by client
  const clients = Object.values(
    appointments.reduce((acc: any, appt: any) => {
      const clientId = appt.ownerId?._id || appt.ownerId;
      if (!acc[clientId]) {
        acc[clientId] = {
          id: clientId,
          name: appt.ownerId?.name || 'Unknown',
          email: appt.ownerId?.email || '',
          appointments: [],
        };
      }
      acc[clientId].appointments.push(appt);
      return acc;
    }, {})
  ) as any[];

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Manage your client relationships</p>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>No clients yet</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Clients will appear here after they book appointments</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {clients.map((client: any) => (
              <div key={client.id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{client.name?.[0]}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>{client.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{client.email}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{client.appointments.length}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>appointments</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="badge badge-green">{client.appointments.filter((a: any) => a.status === 'completed').length} done</span>
                  {client.appointments.filter((a: any) => a.status === 'pending').length > 0 && (
                    <span className="badge badge-orange">{client.appointments.filter((a: any) => a.status === 'pending').length} pending</span>
                  )}
                </div>
                <Link className="btn btn-secondary btn-sm" href={`/messages?provider=${client.id}`}>Message</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

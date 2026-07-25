'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [pets, setPets] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/pets', { headers }).then(r => r.json()),
      fetch('/api/appointments?status=confirmed', { headers }).then(r => r.json()),
      fetch('/api/notifications', { headers }).then(r => r.json()),
    ]).then(([petsData, apptData, notifData]) => {
      setPets(petsData.pets || []);
      setAppointments(apptData.appointments || []);
      setNotifications(notifData.notifications || []);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [token]);

  const quickActions = [
    { icon: '🐾', label: 'Add Pet', href: '/pets', color: '#1D9E75' },
    { icon: '📅', label: 'Book Appointment', href: '/appointments', color: '#378ADD' },
    { icon: '🔍', label: 'Find Providers', href: '/providers', color: '#FF6B35' },
    { icon: '🚨', label: 'Emergency', href: '/emergency', color: '#dc2626' },
  ];

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="page-subtitle">Here's what's happening with your pets today</p>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {[
            { label: 'My Pets', value: pets.length, icon: '🐾', color: 'var(--primary)', bg: 'var(--primary-light)' },
            { label: 'Upcoming', value: appointments.length, icon: '📅', color: 'var(--blue)', bg: 'var(--blue-light)' },
            { label: 'Notifications', value: notifications.filter((n: any) => !n.isRead).length, icon: '🔔', color: 'var(--accent)', bg: 'var(--accent-light)' },
            { label: 'Health Records', value: '—', icon: '📋', color: '#7c3aed', bg: '#f3f0ff' },
          ].map(stat => (
            <div key={stat.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{isLoading ? '...' : stat.value}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Quick Actions</h2>
          <div className="grid-4">
            {quickActions.map(action => (
              <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
                <div className="card card-interactive" style={{
                  padding: '20px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: `1px solid ${action.color}20`,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{action.icon}</div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: action.color }}>{action.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid-2">
          {/* My Pets */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>My Pets</h2>
              <Link href="/pets" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
              </div>
            ) : pets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🐾</div>
                <p className="empty-state-title">No pets yet</p>
                <Link href="/pets" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Add Your First Pet</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pets.slice(0, 3).map((pet: any) => (
                  <div key={pet._id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px', borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 28 }}>{pet.species === 'Dog' ? '🐕' : pet.species === 'Cat' ? '🐈' : '🐾'}</div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{pet.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pet.breed || pet.species}</p>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <span className="badge badge-green">{pet.species}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Upcoming</h2>
              <Link href="/appointments" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
              </div>
            ) : appointments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <p className="empty-state-title">No upcoming appointments</p>
                <Link href="/appointments" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Book Now</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {appointments.slice(0, 3).map((appt: any) => (
                  <div key={appt._id} style={{
                    padding: '12px', borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{appt.serviceType}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(appt.dateTime).toLocaleDateString()} at {new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="badge badge-blue">{appt.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        {notifications.filter((n: any) => !n.isRead).length > 0 && (
          <div className="card" style={{ padding: 24, marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Alerts</h2>
              <Link href="/notifications" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.filter((n: any) => !n.isRead).slice(0, 3).map((notif: any) => (
                <div key={notif._id} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '12px', borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)', border: '1px solid rgba(29,158,117,0.2)',
                }}>
                  <span style={{ fontSize: 18 }}>🔔</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{notif.message}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(notif.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

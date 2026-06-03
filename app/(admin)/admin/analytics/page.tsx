'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [period, setPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch(`/api/admin/analytics?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setAnalytics(data); setIsLoading(false); });
  }, [token, period]);

  const statCards = analytics ? [
    { label: 'New Pet Owners', value: analytics.newUsers, icon: '👥', color: 'var(--primary)' },
    { label: 'New Providers', value: analytics.newProviders, icon: '🏢', color: 'var(--blue)' },
    { label: 'Completed Appointments', value: analytics.appointmentsCompleted, icon: '✅', color: '#16a34a' },
    { label: 'Cancelled Appointments', value: analytics.appointmentsCancelled, icon: '❌', color: '#dc2626' },
    { label: 'Average Rating', value: `${analytics.avgRating} ⭐`, icon: '⭐', color: '#f59e0b' },
  ] : [];

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Platform performance and insights</p>
          </div>
          <select className="input" style={{ maxWidth: 140 }} value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        <div className="grid-3" style={{ marginBottom: 32 }}>
          {isLoading ? (
            [1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)
          ) : (
            statCards.map(stat => (
              <div key={stat.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 32 }}>{stat.icon}</div>
                <div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stat.label}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Top services */}
        {analytics?.topServices?.length > 0 && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Top Services</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {analytics.topServices.map((svc: any) => {
                const max = Math.max(...analytics.topServices.map((s: any) => s.count));
                return (
                  <div key={svc._id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 100, textTransform: 'capitalize' }}>{svc._id}</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(svc.count / max) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, width: 30, textAlign: 'right' }}>{svc.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
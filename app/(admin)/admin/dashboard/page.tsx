'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setStats(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [token]);

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'var(--blue)', bg: 'var(--blue-light)' },
    { label: 'New Today', value: stats.newUsersToday, icon: '🆕', color: 'var(--primary)', bg: 'var(--primary-light)' },
    { label: 'Pending Verifications', value: stats.pendingVerifications, icon: '⏳', color: 'var(--accent)', bg: 'var(--accent-light)', alert: stats.pendingVerifications > 0 },
    { label: 'Flagged Content', value: stats.flaggedPosts + stats.flaggedReviews, icon: '🚩', color: '#dc2626', bg: '#fee2e2', alert: (stats.flaggedPosts + stats.flaggedReviews) > 0 },
    { label: "Today's Appointments", value: stats.todayAppointments, icon: '📅', color: '#7c3aed', bg: '#f3f0ff' },
    { label: 'Pending Bookings', value: stats.pendingAppointments, icon: '📋', color: '#0891b2', bg: '#e0f7fa' },
  ] : [];

  const quickLinks = [
    { href: '/admin/verifications', icon: '✅', label: 'Review Verifications', desc: `${stats?.pendingVerifications || 0} pending` },
    { href: '/admin/moderation', icon: '🛡️', label: 'Content Moderation', desc: `${(stats?.flaggedPosts || 0) + (stats?.flaggedReviews || 0)} flagged` },
    { href: '/admin/analytics', icon: '📊', label: 'View Analytics', desc: 'Platform insights' },
  ];

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview and management</p>
        </div>

        <div className="grid-3" style={{ marginBottom: 32 }}>
          {isLoading ? (
            [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)
          ) : (
            statCards.map(stat => (
              <div key={stat.label} className="stat-card" style={{
                display: 'flex', alignItems: 'center', gap: 16,
                border: stat.alert ? `1px solid ${stat.color}40` : '1px solid var(--border)',
              }}>
                <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {stat.icon}
                </div>
                <div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{stat.label}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick links */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Quick Actions</h2>
          <div className="grid-3">
            {quickLinks.map(link => (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <div className="card card-interactive" style={{ padding: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{link.icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{link.label}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
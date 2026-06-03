'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

const typeIcons: Record<string, string> = {
  APPOINTMENT_REMINDER_24H: '📅',
  APPOINTMENT_REMINDER_2H: '⏰',
  NEW_BOOKING: '🎉',
  BOOKING_CONFIRMATION: '✅',
  APPOINTMENT_UPDATE: '🔄',
  APPOINTMENT_CANCELLED: '❌',
  NEW_REVIEW: '⭐',
  NEW_MESSAGE: '💬',
  VACCINATION_REMINDER: '💉',
  SEASONAL_ALERT: '🚨',
  ANNOUNCEMENT: '📢',
  WARNING: '⚠️',
  DISPUTE_RESOLVED: '⚖️',
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!token) return;
    const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setNotifications(data.notifications || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [token]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Notifications {unreadCount > 0 && <span className="badge badge-orange" style={{ fontSize: 16, verticalAlign: 'middle' }}>{unreadCount} new</span>}</h1>
          <p className="page-subtitle">Stay updated on your pet's care</p>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>All caught up!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>No notifications yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.map(notif => (
              <div
                key={notif._id}
                onClick={() => !notif.isRead && markRead(notif._id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: notif.isRead ? 'var(--white)' : 'var(--primary-light)',
                  border: `1px solid ${notif.isRead ? 'var(--border)' : 'rgba(29,158,117,0.25)'}`,
                  cursor: notif.isRead ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: notif.isRead ? 'var(--surface)' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {typeIcons[notif.type] || '🔔'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: notif.isRead ? 400 : 600, lineHeight: 1.5 }}>{notif.message}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!notif.isRead && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
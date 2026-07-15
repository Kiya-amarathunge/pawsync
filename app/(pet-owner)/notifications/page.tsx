'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Save, Settings } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface AppNotification { _id: string; type: string; message: string; isRead: boolean; actionUrl?: string; deliveredViaPush: boolean; deliveredViaSMS: boolean; createdAt: string }
interface Preferences { inApp: boolean; email: boolean; sms: boolean; push: boolean; appointmentReminders: boolean; healthReminders: boolean; messages: boolean; reviews: boolean; announcements: boolean }
const defaults: Preferences = { inApp: true, email: true, sms: false, push: false, appointmentReminders: true, healthReminders: true, messages: true, reviews: true, announcements: true };

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    if (!token) return;
    const [notificationResponse, preferenceResponse] = await Promise.all([fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } }), fetch('/api/notifications/preferences', { headers: { Authorization: `Bearer ${token}` } })]);
    const [notificationData, preferenceData] = await Promise.all([notificationResponse.json(), preferenceResponse.json()]);
    setNotifications(notificationData.notifications || []); setPreferences({ ...defaults, ...(preferenceData.preferences || {}) }); setIsLoading(false);
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const markRead = async (notification: AppNotification) => {
    if (!notification.isRead) await fetch(`/api/notifications/${notification._id}/read`, { method: 'PATCH', headers });
    setNotifications(current => current.map(item => item._id === notification._id ? { ...item, isRead: true } : item));
    if (notification.actionUrl) router.push(notification.actionUrl);
  };

  const markAllRead = async () => {
    const unreadNotifications = notifications.filter(item => !item.isRead);
    await Promise.all(unreadNotifications.map(notification => fetch(`/api/notifications/${notification._id}/read`, { method: 'PATCH', headers })));
    setNotifications(current => current.map(item => ({ ...item, isRead: true })));
  };

  const savePreferences = async () => {
    try {
      if (preferences.push) {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push notifications are not supported by this browser');
        const permission = await Notification.requestPermission(); if (permission !== 'granted') throw new Error('Push notification permission was not granted');
        const registration = await navigator.serviceWorker.register('/sw.js');
        const keyResponse = await fetch('/api/notifications/push'); const { publicKey } = await keyResponse.json();
        if (!publicKey) throw new Error('Push notifications are not configured on the server');
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
        await fetch('/api/notifications/push', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) });
      }
      const response = await fetch('/api/notifications/preferences', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(preferences) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); showToast(data.message, 'success'); setShowSettings(false);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to update preferences', 'error'); }
  };

  const unread = notifications.filter(item => !item.isRead).length;
  return <DashboardLayout><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}><div><h1 className="page-title">Notifications {unread > 0 && <span className="badge badge-orange">{unread} new</span>}</h1><p className="page-subtitle">Appointments, health, messages and platform updates</p></div><div style={{ display: 'flex', gap: 8 }}><button className="btn btn-secondary" disabled={unread === 0} onClick={() => void markAllRead()}><CheckCheck size={17} /> Mark all read</button><button className="btn btn-secondary" onClick={() => setShowSettings(value => !value)}><Settings size={17} /> Preferences</button></div></div>
    {showSettings && <section className="card" style={{ padding: 20, marginBottom: 18 }}><h2 style={{ fontSize: 17, marginBottom: 14 }}>Delivery preferences</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>{Object.entries(preferences).map(([key, enabled]) => <label key={key} style={{ display: 'flex', gap: 9, alignItems: 'center', textTransform: 'capitalize' }}><input type="checkbox" checked={enabled} onChange={() => setPreferences(current => ({ ...current, [key]: !current[key as keyof Preferences] }))} /> {key.replace(/([A-Z])/g, ' $1')}</label>)}</div><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => void savePreferences()}><Save size={17} /> Save preferences</button></section>}
    {isLoading ? [1, 2, 3].map(value => <div key={value} className="skeleton" style={{ height: 74, marginBottom: 10 }} />) : notifications.length === 0 ? <div className="empty-state"><Bell size={34} /><p>No notifications yet.</p></div> : <div style={{ display: 'grid', gap: 9 }}>{notifications.map(notification => <button key={notification._id} onClick={() => void markRead(notification)} style={{ border: `1px solid ${notification.isRead ? 'var(--border)' : 'rgba(29,158,117,.35)'}`, background: notification.isRead ? 'white' : 'var(--primary-light)', borderRadius: 6, padding: 15, textAlign: 'left', cursor: notification.actionUrl || !notification.isRead ? 'pointer' : 'default', display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) auto', gap: 12, alignItems: 'center' }}><span style={{ width: 40, height: 40, borderRadius: 6, background: 'white', display: 'grid', placeItems: 'center' }}><Bell size={18} /></span><span><strong style={{ fontSize: 14, fontWeight: notification.isRead ? 500 : 700 }}>{notification.message}</strong><small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 3 }}>{new Date(notification.createdAt).toLocaleString()}</small></span><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{notification.deliveredViaPush ? 'Push' : notification.deliveredViaSMS ? 'SMS' : 'In-app'}</span></button>)}</div>}
  </DashboardLayout>;
}

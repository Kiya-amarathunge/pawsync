'use client';

import { useEffect, useState } from 'react';
import { CalendarOff, Plus, Save, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [blockedDate, setBlockedDate] = useState('');
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [availability, setAvailability] = useState(days.map((_, index) => ({ dayOfWeek: index, startTime: '09:00', endTime: '17:00', enabled: index >= 1 && index <= 5 })));

  useEffect(() => {
    if (!user || !token) return;
    fetch(`/api/providers/${user.id}/availability?manage=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.json())
      .then(data => {
        if (!data.availability) return;
        setAvailability(days.map((_, dayOfWeek) => {
          const configured = data.availability.find((item: { dayOfWeek: number }) => item.dayOfWeek === dayOfWeek);
          return { dayOfWeek, startTime: configured?.startTime || '09:00', endTime: configured?.endTime || '17:00', enabled: Boolean(configured) };
        }));
        setBlockedDates((data.blockedDates || []).map((date: string) => date.slice(0, 10)));
      })
      .catch(() => undefined);
  }, [token, user]);

  const save = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/providers/${user.id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability: availability.filter(day => day.enabled).map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })), blockedDates }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      showToast(data.message, 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save availability', 'error'); }
    finally { setIsSaving(false); }
  };

  return <DashboardLayout>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', marginBottom: 24 }}><div><h1 className="page-title">Availability</h1><p className="page-subtitle">Recurring hours and dates when bookings are unavailable</p></div><button className="btn btn-primary" onClick={() => void save()} disabled={isSaving}><Save size={17} /> {isSaving ? 'Saving...' : 'Save'}</button></div>
    <section className="card" style={{ padding: 20 }}>
      {availability.map((day, index) => <div key={day.dayOfWeek} style={{ display: 'grid', gridTemplateColumns: '48px 110px minmax(100px, 150px) 24px minmax(100px, 150px)', gap: 12, alignItems: 'center', minHeight: 58, borderBottom: index < 6 ? '1px solid var(--border)' : undefined, opacity: day.enabled ? 1 : 0.55 }}>
        <input aria-label={`Enable ${days[index]}`} type="checkbox" checked={day.enabled} onChange={() => setAvailability(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: !item.enabled } : item))} />
        <strong style={{ fontSize: 14 }}>{days[index]}</strong>
        <input className="input" type="time" disabled={!day.enabled} value={day.startTime} onChange={event => setAvailability(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: event.target.value } : item))} />
        <span>to</span>
        <input className="input" type="time" disabled={!day.enabled} value={day.endTime} onChange={event => setAvailability(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, endTime: event.target.value } : item))} />
      </div>)}
    </section>
    <section className="card" style={{ padding: 20, marginTop: 16 }}><h2 style={{ fontSize: 17, display: 'flex', gap: 8, marginBottom: 14 }}><CalendarOff size={19} /> Block-out dates</h2><div style={{ display: 'flex', gap: 10 }}><input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={blockedDate} onChange={event => setBlockedDate(event.target.value)} /><button className="btn btn-secondary" type="button" onClick={() => { if (blockedDate && !blockedDates.includes(blockedDate)) setBlockedDates(current => [...current, blockedDate].sort()); setBlockedDate(''); }}><Plus size={17} /> Add</button></div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{blockedDates.map(date => <span className="badge badge-gray" key={date}>{new Date(`${date}T00:00:00`).toLocaleDateString()} <button type="button" onClick={() => setBlockedDates(current => current.filter(item => item !== date))} aria-label={`Remove ${date}`} style={{ border: 0, background: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button></span>)}</div></section>
  </DashboardLayout>;
}

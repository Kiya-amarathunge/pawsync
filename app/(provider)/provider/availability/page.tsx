'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [availability, setAvailability] = useState(
    days.map((_, i) => ({ dayOfWeek: i, startTime: '09:00', endTime: '17:00', enabled: i >= 1 && i <= 5 }))
  );

  const toggleDay = (index: number) => {
    setAvailability(prev => prev.map((d, i) => i === index ? { ...d, enabled: !d.enabled } : d));
  };

  const updateTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const enabledDays = availability.filter(d => d.enabled).map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
      const res = await fetch(`/api/providers/${user?.id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability: enabledDays, blockedDates: [] }),
      });
      if (!res.ok) throw new Error('Failed to save');
      showToast('Availability saved!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Availability</h1>
            <p className="page-subtitle">Set your working hours for each day of the week</p>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><div className="spinner" />Saving...</> : 'Save Changes'}
          </button>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {availability.map((day, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 0',
                borderBottom: i < 6 ? '1px solid var(--border)' : 'none',
                opacity: day.enabled ? 1 : 0.5,
              }}>
                {/* Toggle */}
                <div
                  onClick={() => toggleDay(i)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: day.enabled ? 'var(--primary)' : 'var(--border)',
                    position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: day.enabled ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                    transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>

                {/* Day name */}
                <span style={{ width: 100, fontSize: 14, fontWeight: day.enabled ? 600 : 400 }}>{days[i]}</span>

                {/* Time inputs */}
                {day.enabled ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="time"
                      className="input"
                      style={{ width: 120 }}
                      value={day.startTime}
                      onChange={e => updateTime(i, 'startTime', e.target.value)}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>to</span>
                    <input
                      type="time"
                      className="input"
                      style={{ width: 120 }}
                      value={day.endTime}
                      onChange={e => updateTime(i, 'endTime', e.target.value)}
                    />
                  </div>
                ) : (
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Unavailable</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginTop: 16, background: 'var(--primary-light)', border: '1px solid rgba(29,158,117,0.2)' }}>
          <p style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 500 }}>
            💡 Your availability will be shown to pet owners when they book appointments. Make sure to keep it up to date!
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
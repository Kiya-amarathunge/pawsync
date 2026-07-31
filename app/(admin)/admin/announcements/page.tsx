'use client';

import { useState } from 'react';
import { Megaphone, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface AnnouncementForm {
  title: string;
  message: string;
  targetRoles: string[];
}

interface AlertForm {
  title: string;
  message: string;
  affectedArea: string;
}

const emptyAnnouncement: AnnouncementForm = { title: '', message: '', targetRoles: [] };
const emptyAlert: AlertForm = { title: '', message: '', affectedArea: '' };

export default function AnnouncementsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [announcement, setAnnouncement] = useState<AnnouncementForm>(emptyAnnouncement);
  const [alert, setAlert] = useState<AlertForm>(emptyAlert);
  const [sendingType, setSendingType] = useState<'announcement' | 'alert' | null>(null);

  const roleOptions = [
    { value: 'pet_owner', label: 'Pet Owners' },
    { value: 'veterinarian', label: 'Veterinarians' },
    { value: 'service_provider', label: 'Service Providers' },
  ];

  const toggleRole = (role: string) => {
    setAnnouncement(previous => ({
      ...previous,
      targetRoles: previous.targetRoles.includes(role)
        ? previous.targetRoles.filter(item => item !== role)
        : [...previous.targetRoles, role],
    }));
  };

  const handleSend = async (type: 'announcement' | 'alert') => {
    const isAlert = type === 'alert';
    const form = isAlert ? alert : announcement;
    if (!form.title.trim() || !form.message.trim()) {
      showToast('Title and message are required', 'error');
      return;
    }

    setSendingType(type);
    try {
      const endpoint = isAlert ? '/api/admin/alerts' : '/api/admin/announcements';
      const payload = isAlert
        ? {
            title: alert.title.trim(),
            message: alert.message.trim(),
            affectedArea: alert.affectedArea.trim(),
          }
        : {
            title: announcement.title.trim(),
            message: announcement.message.trim(),
            targetRoles: announcement.targetRoles.length ? announcement.targetRoles : undefined,
          };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to send message');

      showToast(`${isAlert ? 'Alert' : 'Announcement'} sent to ${data.notificationsSent || 0} users`, 'success');
      if (isAlert) setAlert(emptyAlert);
      else setAnnouncement(emptyAnnouncement);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to send message', 'error');
    } finally {
      setSendingType(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Announcements & Alerts</h1>
          <p className="page-subtitle">Send platform-wide messages and health alerts to users</p>
        </div>

        <div className="grid-2" style={{ alignItems: 'flex-start' }}>
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Megaphone size={19} /> New Announcement
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label className="input-group">
                <span className="input-label">Title *</span>
                <input className="input" placeholder="e.g. Platform Maintenance Notice" value={announcement.title} onChange={event => setAnnouncement(previous => ({ ...previous, title: event.target.value }))} />
              </label>
              <label className="input-group">
                <span className="input-label">Message *</span>
                <textarea className="input" rows={4} placeholder="Write your announcement message..." value={announcement.message} onChange={event => setAnnouncement(previous => ({ ...previous, message: event.target.value }))} style={{ resize: 'vertical' }} />
              </label>
              <div className="input-group">
                <span className="input-label">Target Roles (leave empty for all)</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {roleOptions.map(role => {
                    const selected = announcement.targetRoles.includes(role.value);
                    return (
                      <button
                        type="button"
                        key={role.value}
                        onClick={() => toggleRole(role.value)}
                        aria-pressed={selected}
                        className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-outline'}`}
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button className="btn btn-primary btn-full" onClick={() => void handleSend('announcement')} disabled={sendingType !== null}>
                {sendingType === 'announcement' ? <><span className="spinner" />Sending...</> : <><Megaphone size={16} /> Send Announcement</>}
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 24, border: '1px solid rgba(220,38,38,0.2)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TriangleAlert size={19} /> Seasonal Health Alert
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Send urgent disease outbreak or health warnings to pet owners in affected areas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label className="input-group">
                <span className="input-label">Alert Title *</span>
                <input className="input" placeholder="e.g. Canine Parvovirus Outbreak Warning" value={alert.title} onChange={event => setAlert(previous => ({ ...previous, title: event.target.value }))} />
              </label>
              <label className="input-group">
                <span className="input-label">Alert Details *</span>
                <textarea className="input" rows={4} placeholder="Describe the health alert, symptoms to watch for, and recommended actions..." value={alert.message} onChange={event => setAlert(previous => ({ ...previous, message: event.target.value }))} style={{ resize: 'vertical' }} />
              </label>
              <label className="input-group">
                <span className="input-label">Affected Area</span>
                <input className="input" placeholder="e.g. Colombo, Western Province" value={alert.affectedArea} onChange={event => setAlert(previous => ({ ...previous, affectedArea: event.target.value }))} />
              </label>
              <button
                className="btn btn-full"
                style={{ background: '#dc2626', color: 'white', border: 'none' }}
                onClick={() => void handleSend('alert')}
                disabled={sendingType !== null}
              >
                {sendingType === 'alert' ? <><span className="spinner" />Sending...</> : <><TriangleAlert size={16} /> Send Health Alert</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

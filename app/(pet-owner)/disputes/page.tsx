'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CircleAlert, Plus, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Appointment {
  _id: string;
  serviceType: string;
  dateTime: string;
  status: string;
  ownerId?: { name: string };
  providerId?: { name: string };
}

interface Dispute {
  _id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  resolution?: string;
  resolutionAction?: string;
  refundAmount?: number;
  createdAt: string;
  appointmentId?: Appointment;
  openedBy?: { name: string; role: string };
}

const emptyForm = { appointmentId: '', category: 'service_quality', subject: '', description: '' };
const statusClass: Record<string, string> = {
  open: 'badge-orange',
  under_review: 'badge-blue',
  resolved: 'badge-green',
  dismissed: 'badge-gray',
};

export default function DisputesPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [disputeResponse, appointmentResponse] = await Promise.all([
      fetch('/api/disputes', { headers }),
      fetch('/api/appointments', { headers }),
    ]);
    const [disputeData, appointmentData] = await Promise.all([
      disputeResponse.json(),
      appointmentResponse.json(),
    ]);
    if (!disputeResponse.ok) showToast(disputeData.error || 'Unable to load disputes', 'error');
    setDisputes(disputeResponse.ok ? disputeData.disputes || [] : []);
    setAppointments((appointmentData.appointments || []).filter((appointment: Appointment) =>
      ['confirmed', 'completed', 'cancelled', 'rescheduled'].includes(appointment.status)
    ));
    setLoading(false);
  }, [showToast, token]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const response = await fetch('/api/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) {
      setForm(emptyForm);
      setShowForm(false);
      await load();
    }
    setSubmitting(false);
  };

  return <DashboardLayout>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 22 }}>
      <div><h1 className="page-title">Disputes</h1><p className="page-subtitle">Submit and track appointment-related concerns</p></div>
      <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Open dispute</button>
    </div>

    {showForm && <form onSubmit={submit} className="card" style={{ padding: 20, marginBottom: 18, display: 'grid', gap: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><div><h2 style={{ fontSize: 17 }}>Open a dispute</h2><p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>An administrator will review the appointment and your description.</p></div><button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)} aria-label="Close"><X size={17} /></button></div>
      <label className="input-group"><span className="input-label">Related appointment</span><select className="input" value={form.appointmentId} onChange={event => setForm(value => ({ ...value, appointmentId: event.target.value }))} required><option value="">Select an appointment</option>{appointments.map(appointment => <option key={appointment._id} value={appointment._id}>{appointment.serviceType} · {new Date(appointment.dateTime).toLocaleDateString()} · {appointment.status} · {user?.role === 'pet_owner' ? appointment.providerId?.name : appointment.ownerId?.name}</option>)}</select></label>
      <label className="input-group"><span className="input-label">Category</span><select className="input" value={form.category} onChange={event => setForm(value => ({ ...value, category: event.target.value }))}>{[['service_quality', 'Service quality'], ['cancellation', 'Cancellation'], ['billing', 'Billing or charge'], ['refund', 'Refund request'], ['conduct', 'User conduct'], ['other', 'Other']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="input-group"><span className="input-label">Subject</span><input className="input" minLength={5} maxLength={150} value={form.subject} onChange={event => setForm(value => ({ ...value, subject: event.target.value }))} required /></label>
      <label className="input-group"><span className="input-label">What happened?</span><textarea className="input" rows={5} minLength={20} maxLength={5000} value={form.description} onChange={event => setForm(value => ({ ...value, description: event.target.value }))} required /></label>
      <div><button className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit dispute'}</button></div>
    </form>}

    {loading ? <div className="skeleton" style={{ height: 120 }} /> : disputes.length === 0 ? <div className="empty-state"><CircleAlert size={28} /><p>No disputes have been submitted.</p></div> : <div style={{ display: 'grid', gap: 12 }}>
      {disputes.map(dispute => <article key={dispute._id} className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}><div><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{dispute.category.replace('_', ' ')}</span><h2 style={{ fontSize: 16, marginTop: 8 }}>{dispute.subject}</h2><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{dispute.appointmentId?.serviceType} · {dispute.appointmentId?.dateTime ? new Date(dispute.appointmentId.dateTime).toLocaleString() : 'Appointment'} · opened {new Date(dispute.createdAt).toLocaleDateString()}</p></div><span className={`badge ${statusClass[dispute.status] || 'badge-gray'}`}>{dispute.status.replace('_', ' ')}</span></div>
        <p style={{ marginTop: 11, lineHeight: 1.55 }}>{dispute.description}</p>
        {dispute.resolution && <div style={{ marginTop: 13, padding: 12, background: 'var(--primary-light)', borderLeft: '3px solid var(--primary)' }}><strong style={{ fontSize: 13 }}>Administrator resolution</strong><p style={{ marginTop: 4, fontSize: 13 }}>{dispute.resolution}</p>{dispute.resolutionAction === 'refund' && <p style={{ marginTop: 4, fontSize: 13 }}>Approved refund: Rs. {(dispute.refundAmount || 0).toLocaleString()}</p>}</div>}
      </article>)}
    </div>}
  </DashboardLayout>;
}

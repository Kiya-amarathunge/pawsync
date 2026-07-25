'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface EmergencyService {
  _id: string;
  name: string;
  address: string;
  phone: string;
  location: { lat: number; lng: number };
  is24Hours: boolean;
  specializations: string[];
  isVerified: boolean;
  isAvailable: boolean;
}

const emptyForm = {
  name: '',
  address: '',
  phone: '',
  lat: '',
  lng: '',
  is24Hours: false,
  specializations: '',
};

export default function AdminEmergencyServicesPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [services, setServices] = useState<EmergencyService[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}` };

  const loadServices = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const response = await fetch('/api/admin/emergency-services', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) showToast(data.error || 'Unable to load emergency services', 'error');
    setServices(data.services || []);
    setLoading(false);
  }, [showToast, token]);

  useEffect(() => { void loadServices(); }, [loadServices]);

  const closeForm = () => {
    setShowForm(false);
    setEditingId('');
    setForm(emptyForm);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch(
      editingId ? `/api/admin/emergency-services/${editingId}` : '/api/admin/emergency-services',
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lat: Number(form.lat),
          lng: Number(form.lng),
          specializations: form.specializations.split(',').map(value => value.trim()).filter(Boolean),
        }),
      },
    );
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) {
      closeForm();
      await loadServices();
    }
  };

  const edit = (service: EmergencyService) => {
    setEditingId(service._id);
    setForm({
      name: service.name,
      address: service.address,
      phone: service.phone,
      lat: String(service.location.lat),
      lng: String(service.location.lng),
      is24Hours: service.is24Hours,
      specializations: service.specializations.join(', '),
    });
    setShowForm(true);
  };

  const updateStatus = async (service: EmergencyService, update: { isVerified?: boolean; isAvailable?: boolean }) => {
    const response = await fetch(`/api/admin/emergency-services/${service._id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) await loadServices();
  };

  const remove = async (service: EmergencyService) => {
    if (!confirm(`Delete ${service.name}?`)) return;
    const response = await fetch(`/api/admin/emergency-services/${service._id}`, { method: 'DELETE', headers });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) await loadServices();
  };

  return <DashboardLayout>
    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
      <div><h1 className="page-title">Emergency Services</h1><p className="page-subtitle">Register and approve emergency clinics shown to pet owners</p></div>
      <button className="btn btn-primary" onClick={() => { closeForm(); setShowForm(true); }}><Plus size={17} /> Add clinic</button>
    </div>

    {showForm && <form onSubmit={submit} className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ fontSize: 18 }}>{editingId ? 'Edit emergency clinic' : 'Register emergency clinic'}</h2><button type="button" className="btn btn-ghost btn-sm" onClick={closeForm} aria-label="Close"><X size={17} /></button></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <input className="input" placeholder="Clinic name" value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} required />
        <input className="input" placeholder="Phone number" value={form.phone} onChange={event => setForm(value => ({ ...value, phone: event.target.value }))} required />
        <input className="input" placeholder="Address" value={form.address} onChange={event => setForm(value => ({ ...value, address: event.target.value }))} required />
        <input className="input" type="number" step="any" min="-90" max="90" placeholder="Latitude" value={form.lat} onChange={event => setForm(value => ({ ...value, lat: event.target.value }))} required />
        <input className="input" type="number" step="any" min="-180" max="180" placeholder="Longitude" value={form.lng} onChange={event => setForm(value => ({ ...value, lng: event.target.value }))} required />
        <input className="input" placeholder="Specializations, separated by commas" value={form.specializations} onChange={event => setForm(value => ({ ...value, specializations: event.target.value }))} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}><input type="checkbox" checked={form.is24Hours} onChange={event => setForm(value => ({ ...value, is24Hours: event.target.checked }))} /> Open 24 hours</label>
      <button className="btn btn-primary" style={{ marginTop: 16 }}>{editingId ? 'Save changes' : 'Add as pending'}</button>
    </form>}

    {loading ? <div className="skeleton" style={{ height: 150 }} /> : services.length === 0 ? <div className="empty-state"><ShieldAlert size={32} /><p>No emergency clinics have been registered.</p></div> : <div style={{ display: 'grid', gap: 10 }}>
      {services.map(service => <article key={service._id} className="card" style={{ padding: 17, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
          <div><h2 style={{ fontSize: 16 }}>{service.name}</h2><p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{service.address} · {service.phone}</p><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{service.location.lat}, {service.location.lng} · {service.is24Hours ? '24 hours' : 'Limited hours'} · {service.specializations.join(', ') || 'General emergency care'}</p></div>
          <div style={{ display: 'flex', gap: 6 }}><span className={`badge ${service.isVerified ? 'badge-green' : 'badge-orange'}`}>{service.isVerified ? 'Approved' : 'Pending'}</span><span className={`badge ${service.isAvailable ? 'badge-blue' : 'badge-gray'}`}>{service.isAvailable ? 'Available' : 'Busy'}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!service.isVerified && <button className="btn btn-primary btn-sm" onClick={() => void updateStatus(service, { isVerified: true })}><Check size={15} /> Approve</button>}
          {service.isVerified && <button className="btn btn-secondary btn-sm" onClick={() => void updateStatus(service, { isVerified: false })}>Move to pending</button>}
          <button className="btn btn-secondary btn-sm" onClick={() => void updateStatus(service, { isAvailable: !service.isAvailable })}>{service.isAvailable ? 'Mark busy' : 'Mark available'}</button>
          <button className="btn btn-secondary btn-sm" onClick={() => edit(service)}><Pencil size={15} /> Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => void remove(service)}><Trash2 size={15} /> Delete</button>
        </div>
      </article>)}
    </div>}
  </DashboardLayout>;
}

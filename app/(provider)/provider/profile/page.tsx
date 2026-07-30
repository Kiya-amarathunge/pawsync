'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { FileCheck2, MapPin, Plus, Save, Trash2, Upload } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Service { service: string; price: string; duration: string }

export default function ProviderProfilePage() {
  const { token, user, logout } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ businessName: '', businessDescription: '', specialization: '', credentials: '', yearsOfExperience: '', address: '', serviceType: [] as string[] });
  const [services, setServices] = useState<Service[]>([]);
  const availableTypes = user?.role === 'veterinarian' ? ['veterinary'] : ['grooming', 'training', 'sitting', 'boarding'];

  useEffect(() => {
    if (!token) return;
    fetch('/api/provider/profile', { headers: { Authorization: `Bearer ${token}` } }).then(response => response.json()).then(data => {
      const profile = data.profile; if (!profile) return;
      setForm({
        businessName: profile.businessName || '', businessDescription: profile.businessDescription || '', specialization: profile.specialization || '', credentials: profile.credentials || '',
        yearsOfExperience: String(profile.yearsOfExperience || ''), address: profile.location?.address || '',
        serviceType: profile.serviceType || (user?.role === 'veterinarian' ? ['veterinary'] : []),
      });
      setServices((profile.pricing || []).map((item: { service: string; price: number; duration: number }) => ({ service: item.service, price: String(item.price), duration: String(item.duration) })));
    }).catch(() => showToast('Unable to load provider profile', 'error'));
  }, [showToast, token, user?.role]);

  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const payload = {
        businessName: form.businessName || undefined, businessDescription: form.businessDescription, specialization: form.specialization, credentials: form.credentials,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : 0, serviceType: form.serviceType,
        location: { address: form.address },
        pricing: services.filter(item => item.service).map(item => ({ service: item.service, price: Number(item.price), duration: Number(item.duration) })),
      };
      const response = await fetch('/api/provider/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); showToast(data.message, 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to update profile', 'error'); }
    finally { setSaving(false); }
  };

  const uploadCredential = async (file: File) => {
    const body = new FormData(); body.append('file', file);
    const response = await fetch('/api/provider/profile/credentials', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok && data.requiresReapproval) window.setTimeout(logout, 1200);
  };

  return <DashboardLayout><form onSubmit={save} style={{ display: 'grid', gap: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}><div><h1 className="page-title">Provider profile</h1><p className="page-subtitle">Public practice information, services, pricing and credentials</p></div><button className="btn btn-primary" disabled={saving}><Save size={17} /> {saving ? 'Saving...' : 'Save profile'}</button></div>
    <section className="card" style={{ padding: 22, display: 'grid', gap: 14 }}><h2 style={{ fontSize: 17 }}>Public information</h2>{user?.role === 'service_provider' && <label><span className="input-label">Business name</span><input className="input" value={form.businessName} onChange={event => setForm(value => ({ ...value, businessName: event.target.value }))} required /></label>}<label><span className="input-label">Description</span><textarea className="input" rows={4} value={form.businessDescription} onChange={event => setForm(value => ({ ...value, businessDescription: event.target.value }))} /></label><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}><label><span className="input-label">Specialization</span><input className="input" value={form.specialization} onChange={event => setForm(value => ({ ...value, specialization: event.target.value }))} /></label><label><span className="input-label">Years of experience</span><input className="input" type="number" min="0" max="80" value={form.yearsOfExperience} onChange={event => setForm(value => ({ ...value, yearsOfExperience: event.target.value }))} /></label></div><label><span className="input-label">Qualifications and credentials</span><textarea className="input" rows={3} value={form.credentials} onChange={event => setForm(value => ({ ...value, credentials: event.target.value }))} /></label></section>
    <section className="card" style={{ padding: 22 }}><h2 style={{ fontSize: 17, marginBottom: 12 }}>Service categories</h2><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{availableTypes.map(type => <label key={type} style={{ display: 'flex', gap: 7, alignItems: 'center' }}><input type="checkbox" checked={form.serviceType.includes(type)} onChange={() => setForm(value => ({ ...value, serviceType: value.serviceType.includes(type) ? value.serviceType.filter(item => item !== type) : [...value.serviceType, type] }))} /> {type}</label>)}</div></section>
    <section className="card" style={{ padding: 22 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><h2 style={{ fontSize: 17 }}>Services and pricing</h2><button type="button" className="btn btn-secondary btn-sm" onClick={() => setServices(value => [...value, { service: '', price: '', duration: '60' }])}><Plus size={16} /> Add service</button></div><div style={{ display: 'grid', gap: 10 }}>{services.map((service, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) 130px 130px 40px', gap: 10 }}><select className="input" value={service.service} onChange={event => setServices(value => value.map((item, itemIndex) => itemIndex === index ? { ...item, service: event.target.value } : item))}><option value="">Service</option>{availableTypes.map(type => <option key={type}>{type}</option>)}</select><input className="input" type="number" min="0" placeholder="Price" value={service.price} onChange={event => setServices(value => value.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} /><input className="input" type="number" min="15" step="15" placeholder="Minutes" value={service.duration} onChange={event => setServices(value => value.map((item, itemIndex) => itemIndex === index ? { ...item, duration: event.target.value } : item))} /><button type="button" className="btn btn-danger btn-sm" aria-label="Remove service" onClick={() => setServices(value => value.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>)}</div></section>
    <section className="card" style={{ padding: 22, display: 'grid', gap: 12 }}><h2 style={{ fontSize: 17, display: 'flex', gap: 8 }}><MapPin size={19} /> Location</h2><input className="input" placeholder="Practice or business address" value={form.address} onChange={event => setForm(value => ({ ...value, address: event.target.value }))} /><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Owners use this address for location filtering and Google Maps directions.</p></section>
    <section className="card" style={{ padding: 22 }}><h2 style={{ fontSize: 17, display: 'flex', gap: 8, marginBottom: 10 }}><FileCheck2 size={19} /> Verification credentials</h2><p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>Uploading a new credential sends your profile back for administrator review.</p><label className="btn btn-secondary"><Upload size={17} /> Upload credential<input hidden type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => event.target.files?.[0] && void uploadCredential(event.target.files[0])} /></label></section>
  </form></DashboardLayout>;
}

'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Save, UserRound } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function ProfilePage() {
  const { token, updateCurrentUser } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '', role: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.json())
      .then(data => setForm({ name: data.user?.name || '', email: data.user?.email || '', phoneNumber: data.user?.phoneNumber || '', role: data.user?.role || '' }))
      .catch(() => showToast('Unable to load profile', 'error'));
  }, [showToast, token]);

  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: form.name, phoneNumber: form.phoneNumber }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      updateCurrentUser({ name: data.user.name }); showToast(data.message, 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to update profile', 'error'); }
    finally { setSaving(false); }
  };

  return <DashboardLayout><div style={{ maxWidth: 620 }}><div style={{ marginBottom: 24 }}><h1 className="page-title">Profile</h1><p className="page-subtitle">Account identity and contact information</p></div><form onSubmit={save} className="card" style={{ padding: 24, display: 'grid', gap: 16 }}><div style={{ width: 54, height: 54, display: 'grid', placeItems: 'center', borderRadius: 6, background: 'var(--primary-light)', color: 'var(--primary)' }}><UserRound size={25} /></div><label style={{ display: 'grid', gap: 6 }}><span className="input-label">Name</span><input className="input" value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} required /></label><label style={{ display: 'grid', gap: 6 }}><span className="input-label">Email</span><input className="input" value={form.email} disabled /></label><label style={{ display: 'grid', gap: 6 }}><span className="input-label">Phone number</span><input className="input" value={form.phoneNumber} onChange={event => setForm(value => ({ ...value, phoneNumber: event.target.value }))} /></label><label style={{ display: 'grid', gap: 6 }}><span className="input-label">Role</span><input className="input" value={form.role.replace('_', ' ')} disabled /></label><button className="btn btn-primary" disabled={saving}><Save size={17} /> {saving ? 'Saving...' : 'Save profile'}</button></form></div></DashboardLayout>;
}

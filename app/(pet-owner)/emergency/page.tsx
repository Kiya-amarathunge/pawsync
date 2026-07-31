'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, MapPin, Navigation, PhoneCall, ShieldAlert, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Clinic {
  _id: string;
  name: string;
  address: string;
  phone: string;
  is24Hours: boolean;
  availabilityStatus: 'available' | 'busy' | 'call-to-confirm';
  specializations: string[];
}

interface Pet { _id: string; name: string }
interface Resource { id: string; title: string; content: string }

export default function EmergencyPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [petId, setPetId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}` };

  const loadServices = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/emergency/services');
    const data = await response.json();
    if (!response.ok) showToast(data.error || 'Unable to load emergency services', 'error');
    setClinics(data.services || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void loadServices();
    Promise.all([
      fetch('/api/emergency/resources').then(response => response.json()),
      token ? fetch('/api/pets', { headers: { Authorization: `Bearer ${token}` } }).then(response => response.json()) : Promise.resolve({ pets: [] }),
    ]).then(([resourceData, petData]) => {
      setResources(resourceData.resources || []);
      setPets(petData.pets || []);
    });
  }, [loadServices, token]);

  const contactClinic = async () => {
    if (!selectedClinic) return;
    const response = await fetch('/api/emergency/contact', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicId: selectedClinic._id, petId: petId || undefined, reason, shareRecords: false }),
    });
    const data = await response.json();
    if (!response.ok) return showToast(data.error, 'error');
    showToast('Emergency contact logged', 'success');
    window.location.href = `tel:${data.phone}`;
  };

  return <DashboardLayout>
    <section style={{ background: '#b42318', color: 'white', padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}><ShieldAlert size={42} /><div><h1 style={{ fontSize: 28 }}>Emergency Services</h1><p>For immediate danger, call an approved emergency service now. Availability must be confirmed directly.</p></div></div>
    </section>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, .65fr)', gap: 18, alignItems: 'start' }}>
      <main style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div><h2 style={{ fontSize: 18 }}>Approved emergency services</h2><p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>These services are registered and managed by the PawSync administrator.</p></div>
          <button className="btn btn-secondary btn-sm" onClick={() => void loadServices()}><MapPin size={16} /> Refresh list</button>
        </div>
        {loading ? <div className="skeleton" style={{ height: 150 }} /> : clinics.map(clinic => <article key={clinic._id} className="card" style={{ padding: 17 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div><h3 style={{ fontSize: 16 }}>{clinic.name}</h3><p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{clinic.address}</p><p style={{ fontSize: 12, marginTop: 4 }}>{clinic.is24Hours ? 'Open 24/7' : 'Limited hours'} · {clinic.specializations.join(', ') || 'General emergency care'}</p></div>
            <span className={`badge ${clinic.availabilityStatus === 'available' ? 'badge-green' : clinic.availabilityStatus === 'busy' ? 'badge-red' : 'badge-gray'}`}>{clinic.availabilityStatus.replaceAll('-', ' ')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 13, flexWrap: 'wrap' }}>
            <button className="btn btn-danger btn-sm" onClick={() => setSelectedClinic(clinic)}><PhoneCall size={16} /> Call {clinic.phone}</button>
            <a className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clinic.address)}`}><Navigation size={16} /> Directions</a>
          </div>
        </article>)}
        {!loading && clinics.length === 0 && <div className="empty-state"><p>No approved emergency services are currently registered. Contact your regular veterinarian or local emergency hotline.</p></div>}
      </main>
      <aside className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 17, display: 'flex', gap: 8, marginBottom: 12 }}><BookOpen size={18} /> First aid and preparedness</h2>
        {resources.map(resource => <details key={resource.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}><summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{resource.title}</summary><p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 7, lineHeight: 1.5 }}>{resource.content}</p></details>)}
      </aside>
    </div>
    {selectedClinic && <div className="modal-overlay" onClick={() => setSelectedClinic(null)}><div className="modal" onClick={event => event.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 className="modal-title">Contact {selectedClinic.name}</h2><button className="btn btn-ghost btn-sm" onClick={() => setSelectedClinic(null)} aria-label="Close"><X size={17} /></button></div>
      <select className="input" value={petId} onChange={event => setPetId(event.target.value)}><option value="">Pet (optional)</option>{pets.map(pet => <option key={pet._id} value={pet._id}>{pet.name}</option>)}</select>
      <textarea className="input" style={{ marginTop: 10 }} placeholder="Brief reason for emergency" value={reason} onChange={event => setReason(event.target.value)} />
      <button className="btn btn-danger btn-full" style={{ marginTop: 14 }} onClick={() => void contactClinic()}><PhoneCall size={17} /> Log and call now</button>
    </div></div>}
  </DashboardLayout>;
}

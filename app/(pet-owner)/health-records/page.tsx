'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Download, FilePlus2, Search, ShieldCheck } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Pet { _id: string; name: string }
interface HealthDocument { _id: string; filename: string }
interface HealthRecord {
  _id: string; petId: Pet | string; date: string; diagnosis: string; treatment: string;
  prescriptions: string[]; documents: HealthDocument[]; version: number; versionHistoryCount: number;
}

export default function HealthRecordsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [pets, setPets] = useState<Pet[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [petId, setPetId] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ diagnosis: '', treatment: '', prescriptions: '', date: '' });
  const headers = { Authorization: `Bearer ${token}` };

  const loadRecords = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    const query = new URLSearchParams();
    if (petId) query.set('petId', petId);
    if (search) query.set('search', search);
    try {
      const response = await fetch(`/api/health-records?${query}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRecords(data.records || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load health records', 'error');
    } finally { setIsLoading(false); }
  }, [petId, search, showToast, token]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/pets', { headers: { Authorization: `Bearer ${token}` } }).then(response => response.json()).then(data => {
      setPets(data.pets || []);
      setPetId(current => current || data.pets?.[0]?._id || '');
    }).catch(() => undefined);
  }, [token]);
  useEffect(() => { const timer = setTimeout(() => void loadRecords(), 250); return () => clearTimeout(timer); }, [loadRecords]);

  const createRecord = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch('/api/health-records', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, petId, prescriptions: form.prescriptions.split(',').map(value => value.trim()).filter(Boolean) }),
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) { setForm({ diagnosis: '', treatment: '', prescriptions: '', date: '' }); await loadRecords(); }
  };

  const uploadDocument = async (recordId: string, file: File) => {
    const body = new FormData(); body.append('file', file);
    const response = await fetch(`/api/health-records/${recordId}/documents`, { method: 'POST', headers, body });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) await loadRecords();
  };

  const authenticatedDownload = async (url: string, filename: string) => {
    const response = await fetch(url, { headers });
    if (!response.ok) return showToast('Unable to download file', 'error');
    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = filename; anchor.click(); URL.revokeObjectURL(objectUrl);
  };

  const petName = (record: HealthRecord) => typeof record.petId === 'object' ? record.petId.name : pets.find(pet => pet._id === record.petId)?.name || 'Pet';

  return <DashboardLayout>
    <div style={{ marginBottom: 24 }}><h1 className="page-title">Health records</h1><p className="page-subtitle">Encrypted medical history, documents and reports</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
      <form onSubmit={createRecord} className="card" style={{ padding: 20, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={19} color="var(--primary)" /><h2 style={{ fontSize: 17 }}>New encrypted record</h2></div>
        <select className="input" value={petId} onChange={event => setPetId(event.target.value)} required>{pets.map(pet => <option key={pet._id} value={pet._id}>{pet.name}</option>)}</select>
        <input className="input" type="date" value={form.date} onChange={event => setForm(value => ({ ...value, date: event.target.value }))} />
        <textarea className="input" placeholder="Diagnosis" value={form.diagnosis} onChange={event => setForm(value => ({ ...value, diagnosis: event.target.value }))} />
        <textarea className="input" placeholder="Treatment and observations" value={form.treatment} onChange={event => setForm(value => ({ ...value, treatment: event.target.value }))} />
        <input className="input" placeholder="Prescriptions, separated by commas" value={form.prescriptions} onChange={event => setForm(value => ({ ...value, prescriptions: event.target.value }))} />
        <button className="btn btn-primary" disabled={!petId}>Add record</button>
      </form>

      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(150px, 220px)', gap: 10, marginBottom: 16 }}>
          <label style={{ position: 'relative' }}><Search size={17} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} /><input className="input" style={{ paddingLeft: 38 }} placeholder="Search diagnosis, treatment or prescription" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <select className="input" value={petId} onChange={event => setPetId(event.target.value)}><option value="">All pets</option>{pets.map(pet => <option key={pet._id} value={pet._id}>{pet.name}</option>)}</select>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {isLoading ? [1, 2, 3].map(value => <div key={value} className="skeleton" style={{ height: 130 }} />) : records.length === 0 ? <div className="empty-state"><p>No matching health records.</p></div> : records.map(record => <article key={record._id} className="card" style={{ padding: 20, borderLeft: '3px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'start' }}><div><div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><h3 style={{ fontSize: 17 }}>{record.diagnosis || 'General health update'}</h3><span className="badge badge-green">v{record.version}</span></div><p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{petName(record)} · {new Date(record.date).toLocaleDateString()} · {record.versionHistoryCount} secured version{record.versionHistoryCount === 1 ? '' : 's'}</p></div><button className="btn btn-secondary btn-sm" onClick={() => void authenticatedDownload(`/api/health-records/${record._id}/download`, `${petName(record)}-health-report.pdf`)}><Download size={16} /> PDF</button></div>
            {record.treatment && <p style={{ marginTop: 12, fontSize: 14 }}>{record.treatment}</p>}
            {record.prescriptions?.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{record.prescriptions.map(item => <span className="badge badge-gray" key={item}>{item}</span>)}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <label className="btn btn-secondary btn-sm"><FilePlus2 size={16} /> Attach document<input hidden type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => event.target.files?.[0] && void uploadDocument(record._id, event.target.files[0])} /></label>
              {record.documents?.map(file => <button key={file._id} className="btn btn-ghost btn-sm" onClick={() => void authenticatedDownload(`/api/health-records/${record._id}/documents/${file._id}`, file.filename)}><Download size={15} /> {file.filename}</button>)}
            </div>
          </article>)}
        </div>
      </div>
    </div>
  </DashboardLayout>;
}

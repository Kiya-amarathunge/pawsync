'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { FileDown, FilePlus2, Pencil, Plus, Scale, Syringe, Trash2, Upload, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface PetDocument { _id: string; filename: string; mimeType: string; uploadedAt: string }
interface Vaccination { _id: string; vaccine: string; date: string; nextDueDate?: string }
interface Medication { _id: string; medication: string; dosage: string; frequency: string; startDate: string; endDate?: string; nextReminderAt?: string }
interface Pet {
  _id: string; name: string; species: string; breed: string; birthDate?: string; weight?: number;
  weightHistory?: Array<{ _id?: string; weight: number; date: string }>;
  microchipNumber?: string; dietaryInfo?: string; photos: string[]; documents: PetDocument[];
  vaccinationHistory: Vaccination[]; medicationSchedules: Medication[];
}
interface ChartData { labels: string[]; datasets: Array<{ label: string; data: number[]; borderColor: string; backgroundColor: string }> }

const emptyPet = { name: '', species: 'Dog', breed: '', birthDate: '', weight: '', microchipNumber: '', dietaryInfo: '', dietEffect: '' };
const fieldStyle = { display: 'grid', gap: 6 } as const;

export default function PetsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPetForm, setShowPetForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [petForm, setPetForm] = useState(emptyPet);
  const [vaccination, setVaccination] = useState({ vaccine: '', date: '', nextDueDate: '' });
  const [medication, setMedication] = useState({ medication: '', dosage: '', frequency: '', startDate: '', endDate: '', nextReminderAt: '' });
  const [editingVaccinationId, setEditingVaccinationId] = useState('');
  const [editingMedicationId, setEditingMedicationId] = useState('');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [weightEntry, setWeightEntry] = useState({ weight: '', date: new Date().toISOString().slice(0, 10) });

  const selected = pets.find(pet => pet._id === selectedId) || null;
  const headers = { Authorization: `Bearer ${token}` };

  const loadPets = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/pets', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPets(data.pets || []);
      setSelectedId(current => current || data.pets?.[0]?._id || '');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load pets', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, token]);

  useEffect(() => { void loadPets(); }, [loadPets]);
  useEffect(() => {
    if (!selectedId || !token) return;
    fetch(`/api/pets/${selectedId}/chart-data`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.json())
      .then(data => setChartData(data.weightData || null))
      .catch(() => setChartData(null));
  }, [selectedId, token, pets]);

  const submitPet = async (event: FormEvent) => {
    event.preventDefault();
    const url = editing && selected ? `/api/pets/${selected._id}` : '/api/pets';
    const response = await fetch(url, {
      method: editing ? 'PUT' : 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...petForm, weight: petForm.weight ? Number(petForm.weight) : undefined }),
    });
    const data = await response.json();
    if (!response.ok) return showToast(data.error || 'Unable to save pet', 'error');
    showToast(data.message, 'success');
    setPetForm(emptyPet); setShowPetForm(false); setEditing(false);
    await loadPets();
    if (data.pet?._id) setSelectedId(data.pet._id);
  };

  const openEdit = () => {
    if (!selected) return;
    setPetForm({
      name: selected.name, species: selected.species, breed: selected.breed || '',
      birthDate: selected.birthDate?.slice(0, 10) || '', weight: selected.weight ? String(selected.weight) : '',
      microchipNumber: selected.microchipNumber || '', dietaryInfo: selected.dietaryInfo || '', dietEffect: '',
    });
    setEditing(true); setShowPetForm(true);
  };

  const removePet = async () => {
    if (!selected || !confirm(`Delete ${selected.name} and all health records?`)) return;
    const response = await fetch(`/api/pets/${selected._id}`, { method: 'DELETE', headers });
    const data = await response.json();
    if (!response.ok) return showToast(data.error, 'error');
    setSelectedId(''); showToast(data.message, 'success'); await loadPets();
  };

  const uploadFile = async (file: File, kind: 'photo' | 'medical') => {
    if (!selected) return;
    const form = new FormData(); form.append('file', file); form.append('kind', kind);
    const response = await fetch(`/api/pets/${selected._id}/documents`, { method: 'POST', headers, body: form });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) await loadPets();
  };

  const addVaccination = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    const response = await fetch(`/api/pets/${selected._id}/vaccinations`, {
      method: editingVaccinationId ? 'PATCH' : 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vaccination, recordId: editingVaccinationId || undefined }),
    });
    const data = await response.json(); showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) {
      setVaccination({ vaccine: '', date: '', nextDueDate: '' });
      setEditingVaccinationId('');
      await loadPets();
    }
  };

  const addMedication = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    const response = await fetch(`/api/pets/${selected._id}/medications`, {
      method: editingMedicationId ? 'PATCH' : 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...medication, recordId: editingMedicationId || undefined }),
    });
    const data = await response.json(); showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) {
      setMedication({ medication: '', dosage: '', frequency: '', startDate: '', endDate: '', nextReminderAt: '' });
      setEditingMedicationId('');
      await loadPets();
    }
  };

  const editVaccination = (record: Vaccination) => {
    setEditingVaccinationId(record._id);
    setVaccination({
      vaccine: record.vaccine,
      date: record.date.slice(0, 10),
      nextDueDate: record.nextDueDate?.slice(0, 10) || '',
    });
  };

  const editMedication = (record: Medication) => {
    setEditingMedicationId(record._id);
    setMedication({
      medication: record.medication,
      dosage: record.dosage,
      frequency: record.frequency,
      startDate: record.startDate.slice(0, 10),
      endDate: record.endDate?.slice(0, 10) || '',
      nextReminderAt: record.nextReminderAt || '',
    });
  };

  const deleteHealthEntry = async (type: 'vaccinations' | 'medications', recordId: string) => {
    if (!selected || !confirm(`Delete this ${type === 'vaccinations' ? 'vaccination' : 'medication'} record?`)) return;
    const response = await fetch(`/api/pets/${selected._id}/${type}?recordId=${recordId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) await loadPets();
  };

  const addWeight = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const response = await fetch(`/api/pets/${selected._id}/weight`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight: Number(weightEntry.weight), date: weightEntry.date }),
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) {
      setWeightEntry({ weight: '', date: new Date().toISOString().slice(0, 10) });
      await loadPets();
    }
  };

  const downloadDocument = async (document: PetDocument) => {
    if (!selected) return;
    const response = await fetch(`/api/pets/${selected._id}/documents/${document._id}`, { headers });
    if (!response.ok) return showToast('Unable to download document', 'error');
    const url = URL.createObjectURL(await response.blob());
    const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.filename; anchor.click(); URL.revokeObjectURL(url);
  };

  return <DashboardLayout>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 24 }}>
      <div><h1 className="page-title">Pet profiles</h1><p className="page-subtitle">Health, documents, vaccinations, medication and sharing</p></div>
      <button className="btn btn-primary" onClick={() => { setEditing(false); setPetForm(emptyPet); setShowPetForm(true); }}><Plus size={18} /> Add pet</button>
    </div>

    {showPetForm && <form onSubmit={submitPet} className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ fontSize: 18 }}>{editing ? 'Edit pet' : 'New pet'}</h2><button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPetForm(false)} aria-label="Close"><X size={18} /></button></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {(['name', 'species', 'breed', 'birthDate', 'weight', 'microchipNumber'] as const).map(field => <label key={field} style={fieldStyle}><span className="input-label">{field.replace(/([A-Z])/g, ' $1')}</span><input className="input" type={field === 'birthDate' ? 'date' : field === 'weight' ? 'number' : 'text'} value={petForm[field]} onChange={event => setPetForm(value => ({ ...value, [field]: event.target.value }))} required={field === 'name' || field === 'species'} /></label>)}
      </div>
      <label style={{ ...fieldStyle, marginTop: 14 }}><span className="input-label">Dietary information</span><textarea className="input" value={petForm.dietaryInfo} onChange={event => setPetForm(value => ({ ...value, dietaryInfo: event.target.value }))} /></label>
      {editing && <label style={{ ...fieldStyle, marginTop: 14 }}><span className="input-label">Observed effect of diet change</span><input className="input" value={petForm.dietEffect} onChange={event => setPetForm(value => ({ ...value, dietEffect: event.target.value }))} /></label>}
      <button className="btn btn-primary" style={{ marginTop: 16 }}>{editing ? 'Save changes' : 'Create pet'}</button>
    </form>}

    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 10 }}>
        {isLoading ? <div className="skeleton" style={{ height: 120 }} /> : pets.map(pet => <button key={pet._id} onClick={() => setSelectedId(pet._id)} className="card" style={{ padding: 14, textAlign: 'left', borderColor: selectedId === pet._id ? 'var(--primary)' : undefined, cursor: 'pointer' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 52, height: 52, overflow: 'hidden', borderRadius: 6, background: 'var(--surface-secondary)', display: 'grid', placeItems: 'center' }}>{pet.photos?.[0] ? <img src={pet.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : pet.species.slice(0, 1)}</div><div><strong>{pet.name}</strong><p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{pet.breed || pet.species}</p></div></div>
        </button>)}
      </div>

      {selected ? <div style={{ display: 'grid', gap: 16 }}>
        <section className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><h2 style={{ fontSize: 22 }}>{selected.name}</h2><p style={{ color: 'var(--text-secondary)' }}>{selected.species} · {selected.breed || 'Breed not recorded'} · {selected.weight ? `${selected.weight} kg` : 'Weight not recorded'}</p></div><div style={{ display: 'flex', gap: 8 }}><button className="btn btn-secondary btn-sm" onClick={openEdit}><Pencil size={16} /> Edit</button><button className="btn btn-danger btn-sm" onClick={removePet} aria-label="Delete pet"><Trash2 size={16} /></button></div></div>
          <p style={{ marginTop: 12, fontSize: 14 }}><strong>Diet:</strong> {selected.dietaryInfo || 'Not recorded'}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <label className="btn btn-secondary btn-sm"><Upload size={16} /> Photo<input hidden type="file" accept="image/jpeg,image/png" onChange={event => event.target.files?.[0] && void uploadFile(event.target.files[0], 'photo')} /></label>
            <label className="btn btn-secondary btn-sm"><FilePlus2 size={16} /> Medical document<input hidden type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => event.target.files?.[0] && void uploadFile(event.target.files[0], 'medical')} /></label>
          </div>
        </section>

        <section className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div><h3 style={{ fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}><Scale size={18} /> Weight history</h3><p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Record changes without editing the full pet profile.</p></div>
            <form onSubmit={addWeight} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="input" style={{ width: 120 }} type="number" min="0.1" max="500" step="0.1" placeholder="Weight (kg)" value={weightEntry.weight} onChange={event => setWeightEntry(value => ({ ...value, weight: event.target.value }))} required />
              <input className="input" style={{ width: 155 }} type="date" max={new Date().toISOString().slice(0, 10)} value={weightEntry.date} onChange={event => setWeightEntry(value => ({ ...value, date: event.target.value }))} required />
              <button className="btn btn-primary btn-sm">Add weight</button>
            </form>
          </div>
          {chartData?.labels.length ? <div style={{ height: 230, marginTop: 18 }}><Line data={{ ...chartData, labels: chartData.labels.map(label => new Date(label).toLocaleDateString()) }} options={{ maintainAspectRatio: false, responsive: true }} /></div> : <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 18 }}>No weight entries recorded yet.</p>}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <form onSubmit={addVaccination} className="card" style={{ padding: 18, display: 'grid', gap: 10 }}>
            <h3 style={{ fontSize: 16, display: 'flex', gap: 8 }}><Syringe size={18} /> {editingVaccinationId ? 'Edit vaccination' : 'Vaccination'}</h3>
            <input className="input" placeholder="Vaccine" value={vaccination.vaccine} onChange={event => setVaccination(value => ({ ...value, vaccine: event.target.value }))} required />
            <input className="input" type="date" value={vaccination.date} onChange={event => setVaccination(value => ({ ...value, date: event.target.value }))} required />
            <input className="input" type="date" value={vaccination.nextDueDate} onChange={event => setVaccination(value => ({ ...value, nextDueDate: event.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              {editingVaccinationId && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditingVaccinationId(''); setVaccination({ vaccine: '', date: '', nextDueDate: '' }); }}>Cancel</button>}
              <button className="btn btn-primary btn-sm">{editingVaccinationId ? 'Save changes' : 'Add vaccination'}</button>
            </div>
          </form>
          <form onSubmit={addMedication} className="card" style={{ padding: 18, display: 'grid', gap: 10 }}>
            <h3 style={{ fontSize: 16 }}>{editingMedicationId ? 'Edit medication' : 'Medication schedule'}</h3>
            {(['medication', 'dosage', 'frequency'] as const).map(field => <input key={field} className="input" placeholder={field} value={medication[field]} onChange={event => setMedication(value => ({ ...value, [field]: event.target.value }))} required />)}
            <input className="input" type="date" value={medication.startDate} onChange={event => setMedication(value => ({ ...value, startDate: event.target.value }))} required />
            <input className="input" type="datetime-local" value={medication.nextReminderAt} onChange={event => setMedication(value => ({ ...value, nextReminderAt: event.target.value ? new Date(event.target.value).toISOString() : '' }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              {editingMedicationId && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditingMedicationId(''); setMedication({ medication: '', dosage: '', frequency: '', startDate: '', endDate: '', nextReminderAt: '' }); }}>Cancel</button>}
              <button className="btn btn-primary btn-sm">{editingMedicationId ? 'Save changes' : 'Add medication'}</button>
            </div>
          </form>
        </div>

        {(selected.vaccinationHistory?.length || selected.medicationSchedules?.length || selected.documents?.length) ? <section className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Pet health details</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {selected.vaccinationHistory?.map(item => <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 10, background: 'var(--surface-secondary)' }}>
              <div><strong>{item.vaccine}</strong><p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(item.date).toLocaleDateString()}{item.nextDueDate ? ` · due ${new Date(item.nextDueDate).toLocaleDateString()}` : ''}</p></div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => editVaccination(item)} aria-label={`Edit ${item.vaccine}`}><Pencil size={15} /></button>
                <button className="btn btn-danger btn-sm" onClick={() => void deleteHealthEntry('vaccinations', item._id)} aria-label={`Delete ${item.vaccine}`}><Trash2 size={15} /></button>
              </div>
            </div>)}
            {selected.medicationSchedules?.map(item => <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 10, background: 'var(--surface-secondary)' }}>
              <div><strong>{item.medication}</strong><p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.dosage} · {item.frequency}</p></div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => editMedication(item)} aria-label={`Edit ${item.medication}`}><Pencil size={15} /></button>
                <button className="btn btn-danger btn-sm" onClick={() => void deleteHealthEntry('medications', item._id)} aria-label={`Delete ${item.medication}`}><Trash2 size={15} /></button>
              </div>
            </div>)}
            {selected.documents?.map(document => <button key={document._id} className="btn btn-secondary btn-sm" onClick={() => void downloadDocument(document)} style={{ justifyContent: 'flex-start' }}><FileDown size={16} /> {document.filename}</button>)}
          </div>
        </section> : null}
      </div> : <div className="empty-state"><p>Add a pet to begin tracking care.</p></div>}
    </div>
  </DashboardLayout>;
}

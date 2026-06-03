'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function HealthRecordsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ petId: '', diagnosis: '', treatment: '', prescriptions: '', date: '' });

  const fetchData = async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [petsRes, recordsRes] = await Promise.all([
      fetch('/api/pets', { headers }),
      fetch(`/api/health-records${selectedPet ? `?petId=${selectedPet}` : ''}${search ? `&search=${search}` : ''}`, { headers }),
    ]);
    const petsData = await petsRes.json();
    const recordsData = await recordsRes.json();
    setPets(petsData.pets || []);
    setRecords(recordsData.records || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [token, selectedPet, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/health-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          prescriptions: form.prescriptions.split(',').map(p => p.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Health record added!', 'success');
      setShowModal(false);
      setForm({ petId: '', diagnosis: '', treatment: '', prescriptions: '', date: '' });
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Health Records</h1>
            <p className="page-subtitle">Track your pet's medical history</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Record</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <select
            className="input"
            style={{ maxWidth: 200 }}
            value={selectedPet}
            onChange={e => setSelectedPet(e.target.value)}
          >
            <option value="">All Pets</option>
            {pets.map(pet => <option key={pet._id} value={pet._id}>{pet.name}</option>)}
          </select>
          <input
            className="input"
            style={{ maxWidth: 300 }}
            placeholder="🔍 Search diagnosis or treatment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : records.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No health records yet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Start tracking your pet's medical history</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add First Record</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {records.map(record => (
              <div key={record._id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📋</div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 600 }}>{record.diagnosis || 'General Checkup'}</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-gray">v{record.version}</span>
                    <a
                      href={`/api/health-records/${record._id}/download`}
                      className="btn btn-outline btn-sm"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ⬇ Download
                    </a>
                  </div>
                </div>
                {record.treatment && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    <strong>Treatment:</strong> {record.treatment}
                  </p>
                )}
                {record.prescriptions?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {record.prescriptions.map((p: string) => (
                      <span key={p} className="badge badge-blue">💊 {p}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Record Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <h2 className="modal-title">Add Health Record</h2>
              <p className="modal-subtitle">Record your pet's medical information</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="input-group">
                  <label className="input-label">Pet *</label>
                  <select className="input" value={form.petId} onChange={e => setForm(p => ({ ...p, petId: e.target.value }))} required>
                    <option value="">Select a pet</option>
                    {pets.map(pet => <option key={pet._id} value={pet._id}>{pet.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Date</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Diagnosis</label>
                  <input className="input" placeholder="e.g. Mild fever" value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Treatment</label>
                  <input className="input" placeholder="e.g. Rest and hydration" value={form.treatment} onChange={e => setForm(p => ({ ...p, treatment: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Prescriptions (comma separated)</label>
                  <input className="input" placeholder="e.g. Paracetamol 250mg, Vitamin C" value={form.prescriptions} onChange={e => setForm(p => ({ ...p, prescriptions: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                    {isSubmitting ? <><div className="spinner" />Saving...</> : 'Save Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
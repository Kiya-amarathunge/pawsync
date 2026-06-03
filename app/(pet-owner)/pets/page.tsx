'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function PetsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [pets, setPets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', species: 'Dog', breed: '', birthDate: '', weight: '', microchipNumber: '', dietaryInfo: '',
  });

  const fetchPets = async () => {
    if (!token) return;
    const res = await fetch('/api/pets', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setPets(data.pets || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchPets(); }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, weight: Number(form.weight) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Pet added successfully!', 'success');
      setShowModal(false);
      setForm({ name: '', species: 'Dog', breed: '', birthDate: '', weight: '', microchipNumber: '', dietaryInfo: '' });
      fetchPets();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const speciesEmoji: Record<string, string> = { Dog: '🐕', Cat: '🐈', Bird: '🦜', Fish: '🐟', Rabbit: '🐰', Other: '🐾' };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">My Pets</h1>
            <p className="page-subtitle">Manage your pet profiles and health information</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Pet
          </button>
        </div>

        {isLoading ? (
          <div className="grid-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : pets.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🐾</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>No pets yet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Add your first pet to start tracking their health</p>
            <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>Add Your First Pet</button>
          </div>
        ) : (
          <div className="grid-3">
            {pets.map(pet => (
              <div key={pet._id} className="card card-interactive" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{
                    width: 64, height: 64,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32,
                  }}>
                    {speciesEmoji[pet.species] || '🐾'}
                  </div>
                  <span className="badge badge-green">{pet.species}</span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{pet.name}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  {pet.breed || 'Mixed'} {pet.birthDate ? `• Born ${new Date(pet.birthDate).getFullYear()}` : ''}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {pet.weight && <span className="badge badge-gray">⚖️ {pet.weight} kg</span>}
                  {pet.microchipNumber && <span className="badge badge-blue">🔖 Microchipped</span>}
                  {pet.vaccinationHistory?.length > 0 && <span className="badge badge-green">💉 {pet.vaccinationHistory.length} vaccines</span>}
                </div>
                <div className="divider" style={{ margin: '16px 0' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>View Profile</button>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }}>Health Records</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Pet Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <h2 className="modal-title">Add New Pet</h2>
              <p className="modal-subtitle">Fill in your pet's details</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Pet Name *</label>
                    <input className="input" placeholder="Buddy" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Species *</label>
                    <select className="input" value={form.species} onChange={e => setForm(p => ({ ...p, species: e.target.value }))}>
                      {Object.keys(speciesEmoji).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Breed</label>
                    <input className="input" placeholder="Golden Retriever" value={form.breed} onChange={e => setForm(p => ({ ...p, breed: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Weight (kg)</label>
                    <input className="input" type="number" placeholder="25" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Date of Birth</label>
                    <input className="input" type="date" value={form.birthDate} onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Microchip Number</label>
                    <input className="input" placeholder="Optional" value={form.microchipNumber} onChange={e => setForm(p => ({ ...p, microchipNumber: e.target.value }))} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Dietary Info</label>
                  <input className="input" placeholder="Dry food twice a day..." value={form.dietaryInfo} onChange={e => setForm(p => ({ ...p, dietaryInfo: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                    {isSubmitting ? <><div className="spinner" />Adding...</> : 'Add Pet 🐾'}
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
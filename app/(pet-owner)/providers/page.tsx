'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Heart, MapPin, MessageCircle, Navigation, Star, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Pricing { service: string; price: number; duration: number }
interface Provider {
  _id: string; providerId: string; providerName: string; businessName: string; businessDescription?: string;
  serviceType: string[]; specialization?: string; credentials?: string; yearsOfExperience?: number;
  location?: { address?: string; lat?: number; lng?: number }; pricing: Pricing[]; averageRating: number; reviewCount: number;
  acceptanceRate: number; responseTimeMinutes: number | null; distanceKm: number | null; isFavorite: boolean;
}

const serviceTypes = ['all', 'veterinary', 'telemedicine', 'grooming', 'training', 'boarding', 'sitting'];

export default function ProvidersPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ serviceType: 'all', minRating: '0', location: '', specialization: '', maxPrice: '', availableOn: '', lat: '', lng: '' });

  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value && !(key === 'serviceType' && value === 'all') && !(key === 'minRating' && value === '0')) params.set(key, value); });
    if (Number(filters.minRating) > 0) params.set('minRating', filters.minRating);
    try {
      const response = await fetch(`/api/providers?${params}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setProviders(data.providers || []);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to load providers', 'error'); }
    finally { setIsLoading(false); }
  }, [filters, showToast, token]);

  useEffect(() => { const timer = setTimeout(() => void fetchProviders(), 250); return () => clearTimeout(timer); }, [fetchProviders]);

  const useLocation = () => navigator.geolocation.getCurrentPosition(position => setFilters(value => ({ ...value, lat: String(position.coords.latitude), lng: String(position.coords.longitude) })), () => showToast('Location permission was not granted', 'error'));
  const toggleFavorite = async (provider: Provider) => {
    const response = await fetch(`/api/providers/${provider.providerId}/favorite`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) return showToast(data.error, 'error');
    setProviders(current => current.map(item => item.providerId === provider.providerId ? { ...item, isFavorite: data.isFavorite } : item));
    setSelected(current => current?.providerId === provider.providerId ? { ...current, isFavorite: data.isFavorite } : current);
    showToast(data.message, 'success');
  };

  return <DashboardLayout>
    <div style={{ marginBottom: 22 }}><h1 className="page-title">Provider directory</h1><p className="page-subtitle">Verified professionals, transparent prices and live availability</p></div>
    <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
      <select className="input" style={{ maxWidth: 160 }} value={filters.serviceType} onChange={event => setFilters(value => ({ ...value, serviceType: event.target.value }))}>{serviceTypes.map(type => <option key={type} value={type}>{type === 'all' ? 'All services' : type}</option>)}</select>
      <select className="input" style={{ maxWidth: 150 }} value={filters.minRating} onChange={event => setFilters(value => ({ ...value, minRating: event.target.value }))}><option value="0">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option></select>
      <input className="input" style={{ maxWidth: 170 }} placeholder="Location" value={filters.location} onChange={event => setFilters(value => ({ ...value, location: event.target.value }))} />
      <input className="input" style={{ maxWidth: 170 }} placeholder="Specialization" value={filters.specialization} onChange={event => setFilters(value => ({ ...value, specialization: event.target.value }))} />
      <input className="input" style={{ maxWidth: 135 }} type="number" min="0" placeholder="Max price" value={filters.maxPrice} onChange={event => setFilters(value => ({ ...value, maxPrice: event.target.value }))} />
      <input className="input" style={{ maxWidth: 160 }} type="date" min={new Date().toISOString().slice(0, 10)} value={filters.availableOn} onChange={event => setFilters(value => ({ ...value, availableOn: event.target.value }))} />
      <button className="btn btn-secondary" onClick={useLocation}><Navigation size={16} /> Near me</button>
    </section>

    {isLoading ? <div className="grid-3">{[1, 2, 3, 4, 5, 6].map(value => <div key={value} className="skeleton" style={{ height: 255 }} />)}</div> : providers.length === 0 ? <div className="empty-state"><p>No verified providers match these filters.</p></div> : <div className="grid-3">{providers.map(provider => <article key={provider._id} className="card" style={{ padding: 20, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}><div className="avatar" style={{ width: 48, height: 48 }}>{provider.providerName?.[0] || '?'}</div><div style={{ flex: 1 }}><h2 style={{ fontSize: 16 }}>{provider.businessName || provider.providerName}</h2><p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{provider.providerName}</p></div><button className="btn btn-ghost btn-sm" onClick={() => void toggleFavorite(provider)} aria-label={provider.isFavorite ? 'Remove favorite' : 'Save favorite'}><Heart size={18} fill={provider.isFavorite ? 'currentColor' : 'none'} color={provider.isFavorite ? '#dc2626' : undefined} /></button></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Star size={15} fill="#fbbf24" color="#fbbf24" /><strong>{provider.averageRating || 'New'}</strong><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({provider.reviewCount})</span></div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{provider.serviceType.map(type => <span key={type} className="badge badge-green">{type}</span>)}</div>
      {provider.location?.address && <p style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'flex', gap: 6 }}><MapPin size={15} /> {provider.location.address}{provider.distanceKm != null ? ` · ${provider.distanceKm} km` : ''}</p>}
      {provider.pricing?.length > 0 && <p style={{ fontSize: 13 }}>From <strong>Rs. {Math.min(...provider.pricing.map(item => item.price)).toLocaleString()}</strong></p>}
      <button className="btn btn-primary btn-sm btn-full" onClick={() => setSelected(provider)}>View details</button>
    </article>)}</div>}

    {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={event => event.stopPropagation()} style={{ maxWidth: 680, maxHeight: '90vh', overflow: 'auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><h2 className="modal-title">{selected.businessName || selected.providerName}</h2><p className="modal-subtitle">{selected.providerName} · verified provider</p></div><button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button></div><p style={{ lineHeight: 1.6 }}>{selected.businessDescription || 'No description provided.'}</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '18px 0' }}><div className="card" style={{ padding: 12 }}><strong>{selected.yearsOfExperience || 0} years</strong><p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Experience</p></div><div className="card" style={{ padding: 12 }}><strong>{selected.acceptanceRate}%</strong><p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Acceptance</p></div><div className="card" style={{ padding: 12 }}><strong>{selected.responseTimeMinutes == null ? 'New' : `${selected.responseTimeMinutes} min`}</strong><p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Response time</p></div></div>{selected.credentials && <p><strong>Qualifications:</strong> {selected.credentials}</p>}<h3 style={{ fontSize: 16, margin: '18px 0 8px' }}>Services</h3><div style={{ display: 'grid', gap: 8 }}>{selected.pricing?.map(item => <div key={item.service} style={{ display: 'flex', justifyContent: 'space-between', padding: 11, background: 'var(--surface)' }}><span>{item.service} · <Clock size={13} style={{ display: 'inline' }} /> {item.duration} min</span><strong>Rs. {item.price.toLocaleString()}</strong></div>)}</div>{selected.location?.lat != null && selected.location.lng != null && <a className="btn btn-secondary btn-full" style={{ marginTop: 14 }} target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.location.lat},${selected.location.lng}`}><Navigation size={17} /> Directions</a>}<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}><Link className="btn btn-primary" href="/appointments">Book appointment</Link><Link className="btn btn-secondary" href={`/messages?provider=${selected.providerId}`}><MessageCircle size={17} /> Message</Link></div></div></div>}
  </DashboardLayout>;
}

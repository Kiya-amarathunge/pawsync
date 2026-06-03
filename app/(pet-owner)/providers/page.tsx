'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

const serviceTypes = ['all', 'grooming', 'training', 'boarding', 'sitting'];
const serviceEmoji: Record<string, string> = { grooming: '✂️', training: '🎓', boarding: '🏠', sitting: '🐾', veterinary: '🏥' };

export default function ProvidersPage() {
  const { token } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceType, setServiceType] = useState('all');
  const [minRating, setMinRating] = useState(0);

  const fetchProviders = async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (serviceType !== 'all') params.append('serviceType', serviceType);
    if (minRating > 0) params.append('minRating', minRating.toString());
    const res = await fetch(`/api/providers?${params}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    const data = await res.json();
    setProviders(data.providers || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchProviders(); }, [serviceType, minRating]);

  const Stars = ({ rating }: { rating: number }) => (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= Math.round(rating) ? 'star' : 'star-empty'}>★</span>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Find Providers</h1>
          <p className="page-subtitle">Discover trusted pet care professionals near you</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {serviceTypes.map(type => (
              <button
                key={type}
                onClick={() => setServiceType(type)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${serviceType === type ? 'var(--primary)' : 'var(--border)'}`,
                  background: serviceType === type ? 'var(--primary-light)' : 'white',
                  color: serviceType === type ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: serviceType === type ? 600 : 400,
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {serviceEmoji[type] || '🔍'} {type}
              </button>
            ))}
          </div>
          <select
            className="input"
            style={{ maxWidth: 160 }}
            value={minRating}
            onChange={e => setMinRating(Number(e.target.value))}
          >
            <option value={0}>Any Rating</option>
            <option value={3}>3+ Stars</option>
            <option value={4}>4+ Stars</option>
            <option value={4.5}>4.5+ Stars</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid-3">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : providers.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No providers found</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid-3">
            {providers.map(provider => (
              <div key={provider._id} className="card card-interactive" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
                    {provider.providerId?.name?.[0] || '?'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{provider.businessName}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{provider.providerId?.name}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {provider.serviceType?.map((type: string) => (
                    <span key={type} className="badge badge-green" style={{ textTransform: 'capitalize' }}>
                      {serviceEmoji[type]} {type}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Stars rating={provider.averageRating || 0} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{provider.averageRating || 0}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({provider.reviewCount || 0} reviews)</span>
                </div>

                {provider.pricing?.length > 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    💰 From Rs. {Math.min(...provider.pricing.map((p: any) => p.price)).toLocaleString()}
                  </p>
                )}

                <button className="btn btn-primary btn-sm btn-full">Book Appointment</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
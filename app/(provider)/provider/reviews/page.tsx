'use client';
/* eslint-disable react-hooks/static-components */
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Flag } from 'lucide-react';

export default function ProviderReviewsPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    if (!token || !user) return;
    fetch(`/api/reviews?providerId=${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setReviews(data.reviews || []); setIsLoading(false); });
  }, [token, user]);

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const handleRespond = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) throw new Error('Failed to respond');
      showToast('Response added!', 'success');
      setRespondingTo(null);
      setResponse('');
      // Refresh
      const r = await fetch(`/api/reviews?providerId=${user?.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setReviews(d.reviews || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const flagReview = async (reviewId: string) => {
    const reason = prompt('Why should this review be checked by an administrator?');
    if (!reason?.trim()) return;
    const res = await fetch(`/api/reviews/${reviewId}/flag`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    const data = await res.json();
    showToast(res.ok ? data.message : data.error, res.ok ? 'success' : 'error');
    if (res.ok) setReviews(current => current.filter(review => review._id !== reviewId));
  };

  const Stars = ({ rating }: { rating: number }) => (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= rating ? '#fbbf24' : 'var(--border)', fontSize: 16 }}>★</span>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Reviews</h1>
          <p className="page-subtitle">See what your clients say about your services</p>
        </div>

        {/* Summary */}
        {reviews.length > 0 && (
          <div className="card" style={{ padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 48, fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>{avgRating.toFixed(1)}</p>
              <Stars rating={Math.round(avgRating)} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{reviews.length} reviews</p>
            </div>
            <div style={{ flex: 1 }}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.filter(r => r.rating === star).length;
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, width: 16, color: 'var(--text-muted)' }}>{star}</span>
                    <span style={{ color: '#fbbf24', fontSize: 12 }}>★</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#fbbf24', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 20 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>No reviews yet</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Reviews will appear here after clients complete appointments</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reviews.map(review => (
              <div key={review._id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="avatar">{review.ownerId?.name?.[0] || '?'}</div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{review.ownerId?.name || 'Anonymous'}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Stars rating={review.rating} />
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{review.comment}</p>
                {review.providerResponse && (
                  <div style={{ marginTop: 12, padding: '12px', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>Your Response</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{review.providerResponse}</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {!review.providerResponse && (
                  respondingTo === review._id ? (
                    <div style={{ marginTop: 12 }}>
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Write a response to this review..."
                        value={response}
                        onChange={e => setResponse(e.target.value)}
                        style={{ resize: 'vertical', marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setRespondingTo(null)}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleRespond(review._id)}>Post Response</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setRespondingTo(review._id)}>
                      Reply to review
                    </button>
                  )
                )}
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => void flagReview(review._id)}>
                    <Flag size={15} /> Report review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

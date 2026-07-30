'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import ActionDialog from '@/components/ui/ActionDialog';

interface FlaggedPost {
  _id: string;
  title: string;
  content: string;
  category: string;
  moderationReason?: string;
  authorId?: { name: string };
}

interface FlaggedReview {
  _id: string;
  rating: number;
  comment: string;
  moderationReason?: string;
  ownerId?: { name: string };
  providerId?: { name: string };
}

export default function ModerationPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<FlaggedPost[]>([]);
  const [reviews, setReviews] = useState<FlaggedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<{ type: 'post' | 'review'; id: string; action: 'remove' | 'dismiss' | 'warn' } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [postResponse, reviewResponse] = await Promise.all([
      fetch('/api/forum/posts?flagged=true', { headers }),
      fetch('/api/reviews?flagged=true', { headers }),
    ]);
    const [postData, reviewData] = await Promise.all([
      postResponse.json(),
      reviewResponse.json(),
    ]);
    setPosts(postResponse.ok ? postData.posts || [] : []);
    setReviews(reviewResponse.ok ? reviewData.reviews || [] : []);
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const act = async (type: 'post' | 'review', id: string, action: 'remove' | 'dismiss' | 'warn', reason: string) => {
    const response = await fetch(`/api/admin/moderation/${type}/${id}/${action}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(action === 'warn'
        ? { reason, notifyUser: true }
        : { justification: reason }),
    });
    const data = await response.json();
    showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error');
    if (response.ok) { setPendingAction(null); await load(); }
  };

  const actions = (type: 'post' | 'review', id: string) => (
    <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
      <button className="btn btn-danger btn-sm" onClick={() => setPendingAction({ type, id, action: 'remove' })}>Remove</button>
      <button className="btn btn-secondary btn-sm" onClick={() => setPendingAction({ type, id, action: 'warn' })}>Warn author</button>
      <button className="btn btn-secondary btn-sm" onClick={() => setPendingAction({ type, id, action: 'dismiss' })}>Dismiss report</button>
    </div>
  );

  return <DashboardLayout>
    <div style={{ marginBottom: 20 }}>
      <h1 className="page-title">Content moderation</h1>
      <p className="page-subtitle">Review reported forum posts and provider reviews</p>
    </div>
    {loading ? <div className="skeleton" style={{ height: 120 }} /> : <div style={{ display: 'grid', gap: 11 }}>
      {reviews.map(review => <article key={review._id} className="card" style={{ padding: 18, borderLeft: '4px solid #dc2626' }}>
        <span className="badge badge-red">Flagged review</span>
        <p style={{ marginTop: 9, color: '#f59e0b' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
        <p style={{ marginTop: 7 }}>{review.comment}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
          Reason: {review.moderationReason || 'Provider report'} · Author: {review.ownerId?.name || 'Unknown'} · Provider: {review.providerId?.name || 'Unknown'}
        </p>
        {actions('review', review._id)}
      </article>)}
      {posts.map(post => <article key={post._id} className="card" style={{ padding: 18, borderLeft: '4px solid #dc2626' }}>
        <span className="badge badge-red">Flagged · {post.category}</span>
        <h2 style={{ fontSize: 16, marginTop: 8 }}>{post.title}</h2>
        <p style={{ marginTop: 5 }}>{post.content}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 5 }}>
          Reason: {post.moderationReason || 'User report'} · Author: {post.authorId?.name || 'Unknown'}
        </p>
        {actions('post', post._id)}
      </article>)}
      {posts.length === 0 && reviews.length === 0 && <div className="empty-state"><p>No flagged content.</p></div>}
    </div>}
    <ActionDialog open={Boolean(pendingAction)} title={pendingAction?.action === 'remove' ? 'Remove reported content' : pendingAction?.action === 'warn' ? 'Warn the author' : 'Dismiss this report'} description={pendingAction?.action === 'dismiss' ? 'Confirm that the report was reviewed and no content action is required.' : 'The reason is recorded in the administrative audit trail.'} confirmLabel={pendingAction?.action === 'remove' ? 'Remove content' : pendingAction?.action === 'warn' ? 'Send warning' : 'Dismiss report'} reasonLabel={pendingAction?.action === 'dismiss' ? undefined : 'Reason'} reasonPlaceholder="Explain the policy or safety concern" minLength={10} danger={pendingAction?.action === 'remove'} onCancel={() => setPendingAction(null)} onConfirm={reason => pendingAction ? act(pendingAction.type, pendingAction.id, pendingAction.action, reason || 'Report reviewed and dismissed') : undefined} />
  </DashboardLayout>;
}

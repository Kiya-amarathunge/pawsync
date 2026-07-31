'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import ActionDialog from '@/components/ui/ActionDialog';
import Pagination from '@/components/ui/Pagination';

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
  const [postPage, setPostPage] = useState(1);
  const [postPages, setPostPages] = useState(1);
  const [postTotal, setPostTotal] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [pendingAction, setPendingAction] = useState<{ type: 'post' | 'review'; id: string; action: 'remove' | 'dismiss' | 'warn' } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [postResponse, reviewResponse] = await Promise.all([
      fetch(`/api/forum/posts?flagged=true&page=${postPage}`, { headers }),
      fetch(`/api/reviews?flagged=true&page=${reviewPage}`, { headers }),
    ]);
    const [postData, reviewData] = await Promise.all([
      postResponse.json(),
      reviewResponse.json(),
    ]);
    setPosts(postResponse.ok ? postData.posts || [] : []);
    setReviews(reviewResponse.ok ? reviewData.reviews || [] : []);
    setPostTotal(postResponse.ok ? postData.total || 0 : 0);
    setPostPages(postResponse.ok ? Math.max(1, postData.pages || 1) : 1);
    setReviewTotal(reviewResponse.ok ? reviewData.total || 0 : 0);
    setReviewPages(reviewResponse.ok ? Math.max(1, reviewData.pages || 1) : 1);
    setLoading(false);
  }, [postPage, reviewPage, token]);

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
    {loading ? <div className="skeleton" style={{ height: 120 }} /> : <div style={{ display: 'grid', gap: 18 }}>
      {reviewTotal > 0 && <section className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--border)' }}><h2 style={{ fontSize: 16 }}>Reported reviews</h2></div>
        <div style={{ display: 'grid', gap: 11, padding: 12 }}>
      {reviews.map(review => <article key={review._id} style={{ padding: 18, border: '1px solid var(--border)', borderLeft: '4px solid #dc2626', borderRadius: 8 }}>
        <span className="badge badge-red">Flagged review</span>
        <p style={{ marginTop: 9, color: '#f59e0b' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
        <p style={{ marginTop: 7 }}>{review.comment}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
          Reason: {review.moderationReason || 'Provider report'} · Author: {review.ownerId?.name || 'Unknown'} · Provider: {review.providerId?.name || 'Unknown'}
        </p>
        {actions('review', review._id)}
      </article>)}
        </div>
        <Pagination page={reviewPage} pages={reviewPages} total={reviewTotal} itemLabel="reported reviews" onPageChange={setReviewPage} />
      </section>}
      {postTotal > 0 && <section className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--border)' }}><h2 style={{ fontSize: 16 }}>Reported forum posts</h2></div>
        <div style={{ display: 'grid', gap: 11, padding: 12 }}>
      {posts.map(post => <article key={post._id} style={{ padding: 18, border: '1px solid var(--border)', borderLeft: '4px solid #dc2626', borderRadius: 8 }}>
        <span className="badge badge-red">Flagged · {post.category}</span>
        <h2 style={{ fontSize: 16, marginTop: 8 }}>{post.title}</h2>
        <p style={{ marginTop: 5 }}>{post.content}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 5 }}>
          Reason: {post.moderationReason || 'User report'} · Author: {post.authorId?.name || 'Unknown'}
        </p>
        {actions('post', post._id)}
      </article>)}
        </div>
        <Pagination page={postPage} pages={postPages} total={postTotal} itemLabel="reported posts" onPageChange={setPostPage} />
      </section>}
      {posts.length === 0 && reviews.length === 0 && <div className="empty-state"><p>No flagged content.</p></div>}
    </div>}
    <ActionDialog open={Boolean(pendingAction)} title={pendingAction?.action === 'remove' ? 'Remove reported content' : pendingAction?.action === 'warn' ? 'Warn the author' : 'Dismiss this report'} description={pendingAction?.action === 'dismiss' ? 'Confirm that the report was reviewed and no content action is required.' : 'The reason is recorded in the administrative audit trail.'} confirmLabel={pendingAction?.action === 'remove' ? 'Remove content' : pendingAction?.action === 'warn' ? 'Send warning' : 'Dismiss report'} reasonLabel={pendingAction?.action === 'dismiss' ? undefined : 'Reason'} reasonPlaceholder="Explain the policy or safety concern" minLength={10} danger={pendingAction?.action === 'remove'} onCancel={() => setPendingAction(null)} onConfirm={reason => pendingAction ? act(pendingAction.type, pendingAction.id, pendingAction.action, reason || 'Report reviewed and dismissed') : undefined} />
  </DashboardLayout>;
}

'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ModerationPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlagged = async () => {
    if (!token) return;
    const res = await fetch('/api/forum/posts?flagged=true', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setPosts((data.posts || []).filter((p: any) => p.isFlagged));
    setIsLoading(false);
  };

  useEffect(() => { fetchFlagged(); }, [token]);

  const handleRemove = async (id: string) => {
    try {
      await fetch(`/api/admin/moderation/post/${id}/remove`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ justification: 'Violated community guidelines' }),
      });
      showToast('Content removed', 'success');
      fetchFlagged();
    } catch {
      showToast('Failed to remove content', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Content Moderation</h1>
          <p className="page-subtitle">Review and moderate flagged content</p>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>All clear!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>No flagged content to review</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.map(post => (
              <div key={post._id} className="card" style={{ padding: 24, borderLeft: '4px solid #dc2626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span className="badge badge-red">🚩 Flagged</span>
                      <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{post.category}</span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{post.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{post.content.slice(0, 200)}...</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                      Posted by {post.authorId?.name || 'Unknown'} • {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemove(post._id)}>Remove</button>
                    <button className="btn btn-outline btn-sm">Dismiss</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
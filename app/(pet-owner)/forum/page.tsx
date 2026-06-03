'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

const categories = ['all', 'health', 'nutrition', 'training', 'general'];
const categoryEmoji: Record<string, string> = { all: '🌿', health: '🏥', nutrition: '🥗', training: '🎓', general: '💬' };

export default function ForumPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ category: 'health', title: '', content: '' });

  const fetchPosts = async () => {
    const url = activeCategory === 'all' ? '/api/forum/posts' : `/api/forum/posts?category=${activeCategory}`;
    const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    const data = await res.json();
    setPosts(data.posts || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [activeCategory, token]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Post created!', 'success');
      setShowModal(false);
      setForm({ category: 'health', title: '', content: '' });
      fetchPosts();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (postId: string) => {
    if (!reply.trim()) return;
    try {
      const res = await fetch(`/api/forum/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: reply }),
      });
      if (!res.ok) throw new Error('Failed to reply');
      showToast('Reply added!', 'success');
      setReply('');
      fetchPosts();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleVote = async (postId: string) => {
    await fetch(`/api/forum/posts/${postId}/vote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ voteType: 'upvote' }),
    });
    fetchPosts();
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Community Forum</h1>
            <p className="page-subtitle">Share experiences and get advice from fellow pet owners</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Post</button>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border)'}`,
                background: activeCategory === cat ? 'var(--primary-light)' : 'white',
                color: activeCategory === cat ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeCategory === cat ? 600 : 400,
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {categoryEmoji[cat]} {cat}
            </button>
          ))}
        </div>

        {/* Posts */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No posts yet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Be the first to start a conversation!</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create First Post</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {posts.map(post => (
              <div key={post._id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>
                        {categoryEmoji[post.category]} {post.category}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        by {post.authorId?.name || 'Anonymous'} • {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{post.title}</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {post.content.length > 200 ? `${post.content.slice(0, 200)}...` : post.content}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
                  <button
                    onClick={() => handleVote(post._id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 13 }}
                  >
                    👍 {post.upvotes?.length || 0}
                  </button>
                  <button
                    onClick={() => setSelectedPost(selectedPost?._id === post._id ? null : post)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 13 }}
                  >
                    💬 {post.replies?.length || 0} replies
                  </button>
                </div>

                {/* Replies */}
                {selectedPost?._id === post._id && (
                  <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    {post.replies?.map((reply: any) => (
                      <div key={reply.replyId} style={{ padding: '12px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{reply.authorId?.name || 'User'}</span>
                          {reply.isVetVerified && <span className="badge badge-blue">✓ Vet</span>}
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(reply.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{reply.content}</p>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <input
                        className="input"
                        placeholder="Write a reply..."
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleReply(post._id)}>Reply</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Post Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
              <h2 className="modal-title">Create Post</h2>
              <p className="modal-subtitle">Share with the PawSync community</p>
              <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {categories.filter(c => c !== 'all').map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Title *</label>
                  <input className="input" placeholder="What's your question or topic?" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Content *</label>
                  <textarea
                    className="input"
                    rows={5}
                    placeholder="Share details about your experience or question..."
                    value={form.content}
                    onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                    {isSubmitting ? <><div className="spinner" />Posting...</> : 'Post 🌿'}
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
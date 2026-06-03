'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function MessagesPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setConversations(data.conversations || []); setIsLoading(false); });
  }, [token]);

  const loadMessages = async (otherId: string) => {
    setSelectedConv(otherId);
    const res = await fetch(`/api/messages/${otherId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setMessages(data.messages || []);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: selectedConv, content: newMessage }),
      });
      if (!res.ok) throw new Error('Failed to send');
      setNewMessage('');
      loadMessages(selectedConv);
    } catch {
      showToast('Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Chat with your service providers</p>
        </div>

        <div className="card" style={{ display: 'flex', height: 600, overflow: 'hidden', padding: 0 }}>
          {/* Conversations list */}
          <div style={{ width: 280, borderRight: '1px solid var(--border)', overflow: 'auto' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Conversations</h3>
            </div>
            {isLoading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                No conversations yet
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.otherId}
                  onClick={() => loadMessages(conv.otherId)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    background: selectedConv === conv.otherId ? 'var(--primary-light)' : 'transparent',
                    borderLeft: selectedConv === conv.otherId ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                        {conv.lastMessage?.senderId?.name?.[0] || '?'}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>
                          {conv.lastMessage?.senderId?.name || conv.lastMessage?.receiverId?.name || 'User'}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                          {conv.lastMessage?.content}
                        </p>
                      </div>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="badge badge-green" style={{ fontSize: 10, padding: '2px 6px' }}>{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!selectedConv ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48 }}>💬</div>
                <p style={{ fontSize: 15, fontWeight: 500 }}>Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.map(msg => {
                    const isOwn = msg.senderId?._id !== selectedConv;
                    return (
                      <div key={msg._id} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '10px 14px',
                          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isOwn ? 'var(--primary)' : 'var(--surface-2)',
                          color: isOwn ? 'white' : 'var(--text-primary)',
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}>
                          {msg.content}
                          <p style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                  <input
                    className="input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    maxLength={1000}
                  />
                  <button type="submit" className="btn btn-primary" disabled={isSending || !newMessage.trim()}>
                    {isSending ? <div className="spinner" /> : '→'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
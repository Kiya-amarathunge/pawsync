'use client';

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { ChevronDown, Download, Paperclip, Search, Send, UserRound } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Attachment { _id: string; filename: string; mimeType: string; size: number }
interface Message { _id: string; senderId: string; receiverId: string; content: string; attachments: Attachment[]; isRead: boolean; readAt?: string; createdAt: string }
interface Conversation { otherId: string; otherUser: { name: string; role: string }; lastMessage?: Message; unreadCount: number }
interface MessageSearchResult { _id: string; otherId: string; otherName: string; content: string; createdAt: string }
interface Recipient { id: string; name: string; role: string; businessName: string; specialization: string; serviceTypes: string[] }

function MessagesContent() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const requestedProvider = useSearchParams().get('provider');
  const socketRef = useRef<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedName, setSelectedName] = useState('Conversation');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [providersOpen, setProvidersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headers = { Authorization: `Bearer ${token}` };

  const loadConversations = useCallback(async () => {
    if (!token) return;
    const response = await fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (response.ok) setConversations(data.conversations || []);
    setIsLoading(false);
  }, [token]);

  const loadMessages = useCallback(async (otherId: string) => {
    if (!token) return;
    setSelectedId(otherId);
    const response = await fetch(`/api/messages/${otherId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) return showToast(data.error || 'Unable to load conversation', 'error');
    setMessages(data.messages || []); setSelectedName(data.otherUser?.name || 'Conversation');
    socketRef.current?.emit('message:read', { readerId: user?.id, senderId: otherId });
    socketRef.current?.emit('presence:check', otherId);
    setConversations(current => current.map(item => item.otherId === otherId ? { ...item, unreadCount: 0 } : item));
    window.dispatchEvent(new Event('pawsync:counts-changed'));
  }, [showToast, token, user?.id]);

  useEffect(() => {
    void loadConversations();
    if (requestedProvider) void loadMessages(requestedProvider);
  }, [loadConversations, loadMessages, requestedProvider]);

  useEffect(() => {
    if (!token || user?.role !== 'pet_owner') return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRecipientsLoading(true);
      try {
        const response = await fetch(`/api/messages/recipients?q=${encodeURIComponent(recipientQuery.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok) setRecipients(data.recipients || []);
        else showToast(data.error || 'Unable to find providers', 'error');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          showToast('Unable to find providers', 'error');
        }
      } finally {
        if (!controller.signal.aborted) setRecipientsLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [recipientQuery, showToast, token, user?.role]);

  useEffect(() => {
    if (!token || !user) return;
    let disposed = false;
    const initializeSocket = async () => {
      const response = await fetch('/api/socket', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok || disposed) return;
      const socket = io(process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:3001', { auth: { token }, reconnection: true });
      socketRef.current = socket;
      socket.on('message:receive', message => {
        if (message.senderId === selectedId) setMessages(current => current.some(item => item._id === message._id) ? current : [...current, message]);
        void loadConversations();
        window.dispatchEvent(new Event('pawsync:counts-changed'));
      });
      socket.on('message:read', data => { if (data.readerId === selectedId) setMessages(current => current.map(message => message.senderId === user.id ? { ...message, isRead: true, readAt: new Date().toISOString() } : message)); });
      socket.on('user:typing', data => { if (data.senderId === selectedId) setTyping(Boolean(data.isTyping)); });
      socket.on('presence:update', data => { if (data.userId === selectedId) setOnline(Boolean(data.online)); });
    };
    void initializeSocket();
    return () => {
      disposed = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [loadConversations, selectedId, token, user]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault(); const content = newMessage.trim(); if (!content || !selectedId || !user) return;
    const response = await fetch('/api/messages', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId: selectedId, content }) });
    const data = await response.json();
    if (!response.ok) return showToast(data.error || 'Unable to send message', 'error');
    setMessages(current => [...current, data.data]); setNewMessage('');
    socketRef.current?.emit('message:send', { ...data.data, senderId: user.id, receiverId: selectedId });
    socketRef.current?.emit('user:typing', { senderId: user.id, receiverId: selectedId, isTyping: false });
    void loadConversations();
  };

  const updateTyping = (value: string) => {
    setNewMessage(value); if (!user || !selectedId) return;
    socketRef.current?.emit('user:typing', { senderId: user.id, receiverId: selectedId, isTyping: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit('user:typing', { senderId: user.id, receiverId: selectedId, isTyping: false }), 900);
  };

  const sendAttachment = async (file: File) => {
    if (!selectedId || !user) return;
    const body = new FormData(); body.append('receiverId', selectedId); body.append('file', file);
    const response = await fetch('/api/messages/attachments', { method: 'POST', headers, body });
    const data = await response.json();
    if (!response.ok) return showToast(data.error, 'error');
    setMessages(current => [...current, data.data]);
    socketRef.current?.emit('message:send', { ...data.data, senderId: user.id, receiverId: selectedId });
  };

  const downloadAttachment = async (message: Message, attachment: Attachment) => {
    const response = await fetch(`/api/messages/${message._id}/attachments/${attachment._id}`, { headers });
    if (!response.ok) return showToast('Unable to download attachment', 'error');
    const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement('a'); anchor.href = url; anchor.download = attachment.filename; anchor.click(); URL.revokeObjectURL(url);
  };

  const searchMessages = async () => {
    if (!query.trim()) { setSearchResults([]); setHasSearched(false); return; }
    const response = await fetch(`/api/messages/search?q=${encodeURIComponent(query)}`, { headers });
    const data = await response.json();
    setSearchResults(response.ok ? data.messages || [] : []);
    setHasSearched(true);
    if (!response.ok) showToast(data.error || 'Unable to search messages', 'error');
  };

  return <DashboardLayout><div style={{ marginBottom: 20 }}><h1 className="page-title">Messages</h1><p className="page-subtitle">Real-time owner and provider communication</p></div>
    <div className="card" style={{ height: 'min(680px, calc(100vh - 180px))', display: 'grid', gridTemplateColumns: '290px minmax(0, 1fr)', overflow: 'hidden', padding: 0 }}>
      <aside style={{ borderRight: '1px solid var(--border)', minHeight: 0, overflow: 'auto' }}>
        {user?.role === 'pet_owner' ? <section style={{ borderBottom: '1px solid var(--border)' }}>
          <button type="button" aria-expanded={providersOpen} onClick={() => setProvidersOpen(value => !value)} style={{ width: '100%', minHeight: 48, padding: '11px 14px', border: 0, background: 'transparent', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'left' }}><UserRound size={17} color="var(--primary)" /><strong style={{ flex: 1, fontSize: 13 }}>Providers and veterinarians</strong><ChevronDown size={17} style={{ transform: providersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease' }} /></button>
          {providersOpen && <><div style={{ padding: '0 14px 10px' }}><span style={{ position: 'relative', display: 'block' }}><Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} /><input className="input" style={{ paddingLeft: 34 }} placeholder="Search vets or providers" value={recipientQuery} onChange={event => setRecipientQuery(event.target.value)} autoFocus /></span></div>
          <div style={{ maxHeight: 260, overflowY: 'auto', borderTop: '1px solid var(--border)' }}><p style={{ padding: '9px 14px 4px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{recipientQuery ? 'Matching providers' : 'Approved providers'}</p>
          {recipientsLoading ? <div className="skeleton" style={{ margin: 14, height: 52 }} /> : recipients.length ? recipients.map(recipient => <button key={recipient.id} onClick={() => { setProvidersOpen(false); void loadMessages(recipient.id); }} style={{ width: '100%', border: 0, background: selectedId === recipient.id ? 'var(--primary-light)' : 'transparent', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: 9, alignItems: 'center' }}><span style={{ width: 34, height: 34, borderRadius: 6, background: 'var(--surface-2)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}><UserRound size={17} /></span><span style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipient.businessName || recipient.name}</strong><small style={{ display: 'block', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipient.role === 'veterinarian' ? recipient.name : `${recipient.name} · ${recipient.serviceTypes.join(', ') || 'Service provider'}`}</small></span></button>) : <p style={{ padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>No approved providers match that name.</p>}</div></>}
        </section> : <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}><div style={{ display: 'flex', gap: 6 }}><input className="input" placeholder="Search message text" value={query} onChange={event => { setQuery(event.target.value); if (!event.target.value) { setSearchResults([]); setHasSearched(false); } }} onKeyDown={event => event.key === 'Enter' && void searchMessages()} /><button className="btn btn-secondary btn-sm" onClick={() => void searchMessages()} aria-label="Search"><Search size={16} /></button></div></div>}
        {hasSearched && <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>{searchResults.length ? searchResults.map(result => <button key={result._id} onClick={() => void loadMessages(result.otherId)} style={{ display: 'block', width: '100%', border: 0, background: 'none', padding: 7, textAlign: 'left', cursor: 'pointer', fontSize: 12 }}><strong>{result.otherName}</strong><span style={{ display: 'block', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.content}</span></button>) : <p style={{ padding: 7, color: 'var(--text-muted)', fontSize: 12 }}>No matching messages found.</p>}</div>}
        <p style={{ padding: '10px 14px 4px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Conversations</p>
        {isLoading ? <div className="skeleton" style={{ margin: 14, height: 60 }} /> : conversations.length ? conversations.map(conversation => <button key={conversation.otherId} onClick={() => void loadMessages(conversation.otherId)} style={{ width: '100%', border: 0, borderLeft: selectedId === conversation.otherId ? '3px solid var(--primary)' : '3px solid transparent', background: selectedId === conversation.otherId ? 'var(--primary-light)' : 'transparent', padding: 14, textAlign: 'left', cursor: 'pointer' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong style={{ fontSize: 13 }}>{conversation.otherUser?.name || 'User'}</strong>{conversation.unreadCount > 0 && <span className="badge badge-green">{conversation.unreadCount}</span>}</div><p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.lastMessage?.content || conversation.lastMessage?.attachments?.[0]?.filename}</p></button>) : <p style={{ padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>No conversations yet.</p>}
      </aside>
      <section style={{ minWidth: 0, minHeight: 0, display: 'grid', gridTemplateRows: '58px minmax(0, 1fr) auto' }}>{selectedId ? <><header style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}><strong>{selectedName}</strong><p style={{ fontSize: 11, color: online ? 'var(--primary)' : 'var(--text-muted)' }}>{online ? 'Online' : 'Offline'}{typing ? ' · typing...' : ''}</p></header><div style={{ minHeight: 0, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>{messages.map(message => { const own = message.senderId === user?.id; return <div key={message._id} style={{ alignSelf: own ? 'flex-end' : 'flex-start', maxWidth: '75%' }}><div style={{ padding: '9px 12px', borderRadius: 6, background: own ? 'var(--primary)' : 'var(--surface-2)', color: own ? 'white' : 'inherit' }}>{message.content && <p>{message.content}</p>}{message.attachments?.map(attachment => <button key={attachment._id} onClick={() => void downloadAttachment(message, attachment)} style={{ border: 0, background: 'transparent', color: 'inherit', padding: '5px 0', display: 'flex', gap: 6, cursor: 'pointer' }}><Download size={15} /> {attachment.filename}</button>)}</div><p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textAlign: own ? 'right' : 'left' }}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{own ? message.isRead ? ' · Read' : ' · Sent' : ''}</p></div>; })}</div><form onSubmit={sendMessage} style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}><label className="btn btn-secondary" aria-label="Attach file"><Paperclip size={17} /><input hidden type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => event.target.files?.[0] && void sendAttachment(event.target.files[0])} /></label><input className="input" maxLength={1000} placeholder="Type a message" value={newMessage} onChange={event => updateTyping(event.target.value)} /><button className="btn btn-primary" disabled={!newMessage.trim()} aria-label="Send"><Send size={17} /></button></form></> : <div style={{ gridRow: '1 / -1', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}><p>Select a conversation or message a provider.</p></div>}</section>
    </div>
  </DashboardLayout>;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="skeleton" style={{ height: 680 }} /></DashboardLayout>}>
      <MessagesContent />
    </Suspense>
  );
}

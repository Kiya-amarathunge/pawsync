'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useParams, useRouter } from 'next/navigation';
import { Camera, CameraOff, CircleStop, Mic, MicOff, MonitorUp, RefreshCw, Send, Stethoscope } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Consultation { _id: string; petId: string; recordingMetadata: string }
interface HealthRecord { _id: string; diagnosis: string; treatment: string; date: string }
interface ChatMessage { text: string; isOwn: boolean; sentAt: string }
type Quality = 'connecting' | 'good' | 'fair' | 'poor';

export default function ConsultationPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const appointmentId = useParams().id as string;
  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const roomRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraIndexRef = useRef(0);
  const startedRef = useRef(false);

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [petName, setPetName] = useState('Patient');
  const [connected, setConnected] = useState(false);
  const [quality, setQuality] = useState<Quality>('connecting');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'chat' | 'records' | 'notes'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [consultationType, setConsultationType] = useState<'routine' | 'emergency'>('routine');
  const [ending, setEnding] = useState(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (statsRef.current) clearInterval(statsRef.current);
    socketRef.current?.disconnect();
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    timerRef.current = null; statsRef.current = null; socketRef.current = null; peerRef.current = null; localStreamRef.current = null;
  }, []);

  const measureQuality = (peer: RTCPeerConnection) => {
    statsRef.current = setInterval(async () => {
      const stats = await peer.getStats();
      let received = 0; let lost = 0;
      stats.forEach(report => { if (report.type === 'inbound-rtp' && report.kind === 'video') { received += report.packetsReceived || 0; lost += report.packetsLost || 0; } });
      const loss = received + lost > 0 ? lost / (received + lost) : 0;
      setQuality(loss > 0.08 ? 'poor' : loss > 0.03 ? 'fair' : 'good');
    }, 5000);
  };

  const start = useCallback(async () => {
    if (!token || !user || startedRef.current) return;
    startedRef.current = true;
    try {
      const response = await fetch('/api/consultations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ appointmentId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConsultation(data.consultation); setPetName(data.pet?.name || 'Patient'); roomRef.current = data.roomId;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerRef.current = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.ontrack = event => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; setConnected(true); setQuality('good'); if (!timerRef.current) timerRef.current = setInterval(() => setDuration(value => value + 1), 1000); };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') { setConnected(true); setQuality('good'); }
        if (['disconnected', 'failed'].includes(peer.connectionState)) { setConnected(false); setQuality('poor'); peer.restartIce(); }
      };
      await fetch('/api/socket', { headers: { Authorization: `Bearer ${token}` } });
      const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:3001';
      const socket = io(signalingUrl, { auth: { token }, reconnection: true, reconnectionAttempts: 8 });
      socketRef.current = socket;
      peer.onicecandidate = event => { if (event.candidate) socket.emit('webrtc:ice-candidate', { roomId: data.roomId, candidate: event.candidate }); };
      socket.on('connect', () => socket.emit('webrtc:join-room', data.roomId));
      socket.on('reconnect', () => socket.emit('webrtc:join-room', data.roomId));
      socket.on('webrtc:user-joined', async () => { const offer = await peer.createOffer(); await peer.setLocalDescription(offer); socket.emit('webrtc:offer', { roomId: data.roomId, offer }); });
      socket.on('webrtc:offer', async offer => { await peer.setRemoteDescription(offer); const answer = await peer.createAnswer(); await peer.setLocalDescription(answer); socket.emit('webrtc:answer', { roomId: data.roomId, answer }); });
      socket.on('webrtc:answer', async answer => peer.setRemoteDescription(answer));
      socket.on('webrtc:ice-candidate', async candidate => { try { await peer.addIceCandidate(candidate); } catch { /* Candidate can arrive during renegotiation. */ } });
      socket.on('consultation:chat', message => setMessages(current => [...current, { text: message.text, isOwn: false, sentAt: message.sentAt }]));
      socket.on('webrtc:user-left', () => { setConnected(false); setQuality('connecting'); });
      socket.on('webrtc:error', message => showToast(message, 'error'));
      measureQuality(peer);
      if (user.role === 'veterinarian') {
        const recordsResponse = await fetch(`/api/consultations/${data.consultation._id}/records`, { headers: { Authorization: `Bearer ${token}` } });
        const recordsData = await recordsResponse.json(); setRecords(recordsData.healthRecords || []);
      }
    } catch (error) {
      startedRef.current = false;
      showToast(error instanceof Error ? error.message : 'Could not start consultation', 'error');
      setQuality('poor');
    }
  }, [appointmentId, showToast, token, user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void start(); return cleanup; }, [cleanup, start]);

  const toggleMute = () => { localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = muted; }); setMuted(value => !value); };
  const toggleVideo = () => { localStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = videoOff; }); setVideoOff(value => !value); };

  const shareScreen = async () => {
    if (sharingScreen) return;
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      const sender = peerRef.current?.getSenders().find(item => item.track?.kind === 'video');
      await sender?.replaceTrack(track); setSharingScreen(true);
      track.onended = async () => { const camera = localStreamRef.current?.getVideoTracks()[0]; if (camera) await sender?.replaceTrack(camera); setSharingScreen(false); };
    } catch { showToast('Screen sharing was cancelled', 'info'); }
  };

  const switchCamera = async () => {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput');
    if (devices.length < 2) return showToast('No second camera is available', 'info');
    cameraIndexRef.current = (cameraIndexRef.current + 1) % devices.length;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: devices[cameraIndexRef.current].deviceId } } });
    const nextTrack = stream.getVideoTracks()[0];
    const previous = localStreamRef.current?.getVideoTracks()[0]; previous?.stop();
    if (localStreamRef.current && previous) { localStreamRef.current.removeTrack(previous); localStreamRef.current.addTrack(nextTrack); }
    await peerRef.current?.getSenders().find(sender => sender.track?.kind === 'video')?.replaceTrack(nextTrack);
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
  };

  const sendMessage = () => {
    const text = chatInput.trim(); if (!text || !socketRef.current) return;
    socketRef.current.emit('consultation:chat', { roomId: roomRef.current, text });
    setMessages(current => [...current, { text, isOwn: true, sentAt: new Date().toISOString() }]); setChatInput('');
  };

  const endCall = async () => {
    if (user?.role === 'veterinarian' && !diagnosis.trim()) { setActiveTab('notes'); return showToast('Add a diagnosis before completing the consultation', 'error'); }
    setEnding(true);
    try {
      if (user?.role === 'veterinarian' && consultation) {
        const response = await fetch(`/api/consultations/${consultation._id}/end`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ notes, diagnosis, prescription, duration, type: consultationType, callQuality: quality === 'good' ? 5 : quality === 'fair' ? 3 : 1 }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        showToast(data.message, 'success');
      }
      cleanup(); router.push(user?.role === 'pet_owner' ? '/appointments' : '/provider/appointments');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to end consultation', 'error'); setEnding(false); }
  };

  const formatDuration = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const qualityColor = quality === 'good' ? '#34d399' : quality === 'fair' ? '#fbbf24' : quality === 'poor' ? '#f87171' : '#94a3b8';

  return <div style={{ height: '100dvh', background: '#090d0b', color: 'white', display: 'grid', gridTemplateRows: '64px minmax(0, 1fr) 82px', overflow: 'hidden' }}>
    <header style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#141a17', borderBottom: '1px solid #26302b' }}><div><strong>PawSync Consultation</strong><p style={{ fontSize: 12, color: '#9aa5b1' }}>{petName} · {consultationType}</p></div><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: qualityColor }} /><span style={{ fontSize: 12, color: qualityColor, textTransform: 'capitalize' }}>{quality}</span><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDuration(duration)}</strong></div></header>
    <main style={{ minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px' }}>
      <section style={{ position: 'relative', minWidth: 0 }}><video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />{!connected && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><div style={{ textAlign: 'center' }}><RefreshCw size={34} style={{ margin: '0 auto 12px' }} /><p>Waiting for the other participant</p></div></div>}<div style={{ position: 'absolute', right: 18, bottom: 18, width: 'clamp(120px, 18vw, 210px)', aspectRatio: '4 / 3', border: '2px solid #36423c', borderRadius: 6, overflow: 'hidden', background: '#111' }}><video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div></section>
      <aside style={{ minWidth: 0, background: '#141a17', borderLeft: '1px solid #26302b', display: 'grid', gridTemplateRows: '48px minmax(0, 1fr)' }}><div style={{ display: 'flex', borderBottom: '1px solid #26302b' }}>{(['chat', ...(user?.role === 'veterinarian' ? ['records', 'notes'] : [])] as Array<'chat' | 'records' | 'notes'>).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, border: 0, borderBottom: activeTab === tab ? '2px solid #34d399' : '2px solid transparent', background: 'none', color: activeTab === tab ? 'white' : '#9aa5b1', textTransform: 'capitalize', cursor: 'pointer' }}>{tab}</button>)}</div>
        {activeTab === 'chat' && <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'minmax(0, 1fr) 58px' }}><div style={{ overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>{messages.map((message, index) => <div key={`${message.sentAt}-${index}`} style={{ alignSelf: message.isOwn ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '8px 11px', borderRadius: 6, background: message.isOwn ? '#1d9e75' : '#26302b', fontSize: 13 }}>{message.text}</div>)}</div><div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #26302b' }}><input value={chatInput} maxLength={1000} onChange={event => setChatInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') sendMessage(); }} style={{ flex: 1, minWidth: 0, border: '1px solid #36423c', background: '#1b231f', color: 'white', borderRadius: 5, padding: '8px 10px' }} /><button onClick={sendMessage} aria-label="Send message" style={{ width: 38, border: 0, borderRadius: 5, background: '#1d9e75', color: 'white' }}><Send size={17} /></button></div></div>}
        {activeTab === 'records' && <div style={{ overflow: 'auto', padding: 14 }}>{records.length ? records.map(record => <article key={record._id} style={{ padding: 12, marginBottom: 9, background: '#1b231f', borderRadius: 6 }}><strong style={{ fontSize: 13 }}>{record.diagnosis || 'General update'}</strong><p style={{ color: '#9aa5b1', fontSize: 11 }}>{new Date(record.date).toLocaleDateString()}</p><p style={{ marginTop: 6, fontSize: 12 }}>{record.treatment}</p></article>) : <p style={{ color: '#9aa5b1', fontSize: 13 }}>No records available.</p>}</div>}
        {activeTab === 'notes' && <div style={{ overflow: 'auto', padding: 14, display: 'grid', alignContent: 'start', gap: 10 }}><div style={{ display: 'flex', gap: 8 }}><button className={`btn btn-sm ${consultationType === 'routine' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setConsultationType('routine')}>Routine</button><button className={`btn btn-sm ${consultationType === 'emergency' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setConsultationType('emergency')}>Emergency</button></div><textarea placeholder="Clinical notes and observations" value={notes} onChange={event => setNotes(event.target.value)} style={{ minHeight: 120, background: '#1b231f', border: '1px solid #36423c', borderRadius: 5, color: 'white', padding: 10 }} /><textarea placeholder="Diagnosis (required)" value={diagnosis} onChange={event => setDiagnosis(event.target.value)} style={{ minHeight: 90, background: '#1b231f', border: '1px solid #36423c', borderRadius: 5, color: 'white', padding: 10 }} /><textarea placeholder="Prescription and follow-up instructions" value={prescription} onChange={event => setPrescription(event.target.value)} style={{ minHeight: 90, background: '#1b231f', border: '1px solid #36423c', borderRadius: 5, color: 'white', padding: 10 }} /></div>}
      </aside>
    </main>
    <footer style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', background: '#141a17', borderTop: '1px solid #26302b' }}><button className="btn btn-secondary" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>{muted ? <MicOff size={19} /> : <Mic size={19} />}</button><button className="btn btn-secondary" onClick={toggleVideo} title={videoOff ? 'Turn camera on' : 'Turn camera off'}>{videoOff ? <CameraOff size={19} /> : <Camera size={19} />}</button><button className="btn btn-secondary" onClick={() => void shareScreen()} title="Share screen"><MonitorUp size={19} /></button><button className="btn btn-secondary" onClick={() => void switchCamera()} title="Switch camera"><Camera size={19} /><RefreshCw size={13} /></button>{user?.role === 'veterinarian' && <button className="btn btn-secondary" onClick={() => setActiveTab('notes')} title="Clinical summary"><Stethoscope size={19} /></button>}<button className="btn btn-danger" onClick={() => void endCall()} disabled={ending} title="End call"><CircleStop size={20} /> {ending ? 'Ending...' : 'End'}</button></footer>
  </div>;
}

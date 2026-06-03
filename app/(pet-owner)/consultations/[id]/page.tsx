'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useParams, useRouter } from 'next/navigation';

export default function ConsultationPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const [consultation, setConsultation] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ text: string; isOwn: boolean }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [petRecords, setPetRecords] = useState<any[]>([]);
  const [showRecords, setShowRecords] = useState(false);
  const durationRef = useRef<any>(null);

  useEffect(() => {
    startConsultation();
    return () => {
      cleanup();
    };
  }, [appointmentId]);

  const startConsultation = async () => {
    try {
      // Start consultation and get room ID
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConsultation(data.consultation);

      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Set up WebRTC peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        setIsConnected(true);
        setIsConnecting(false);
        durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.send(JSON.stringify({
            type: 'webrtc:ice-candidate',
            roomId: data.roomId,
            candidate: event.candidate,
          }));
        }
      };

      // Connect to signaling server
      const ws = new WebSocket(`ws://localhost:3001`);
      socketRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'webrtc:join-room', roomId: data.roomId, userId: user?.id }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'webrtc:user-joined') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: 'webrtc:offer', roomId: data.roomId, offer }));
        } else if (msg.type === 'webrtc:offer') {
          await pc.setRemoteDescription(msg.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'webrtc:answer', roomId: data.roomId, answer }));
        } else if (msg.type === 'webrtc:answer') {
          await pc.setRemoteDescription(msg.answer);
          setIsConnected(true);
          setIsConnecting(false);
        } else if (msg.type === 'webrtc:ice-candidate') {
          await pc.addIceCandidate(msg.candidate);
        }
      };

      setIsConnecting(false);

      // Fetch pet records if vet
      if (user?.role === 'veterinarian' && data.consultation?.petId) {
        const recRes = await fetch(`/api/health-records?petId=${data.consultation.petId}`, { headers: { Authorization: `Bearer ${token}` } });
        const recData = await recRes.json();
        setPetRecords(recData.records || []);
      }

    } catch (err: any) {
      showToast(err.message || 'Could not start consultation', 'error');
      setIsConnecting(false);
    }
  };

  const cleanup = () => {
    if (durationRef.current) clearInterval(durationRef.current);
    peerConnectionRef.current?.close();
    socketRef.current?.close();
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  const toggleMute = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    stream?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    stream?.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
    setIsVideoOff(!isVideoOff);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { text: chatInput, isOwn: true }]);
    setChatInput('');
  };

  const endCall = async () => {
    cleanup();
    if (consultation?._id && user?.role === 'veterinarian') {
      await fetch(`/api/consultations/${consultation._id}/end`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes, duration, diagnosis: '', prescription: '' }),
      });
    }
    showToast('Consultation ended', 'info');
    router.push('/appointments');
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ height: '100vh', background: '#0a0f0d', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#141a17', borderBottom: '1px solid #1e2722' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🐾</span>
          <div>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>PawSync Telemedicine</p>
            <p style={{ color: '#9aa5b1', fontSize: 12 }}>Video Consultation</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e2722', padding: '6px 14px', borderRadius: 'var(--radius-full)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} className="animate-pulse-green" />
              <span style={{ color: '#1D9E75', fontSize: 13, fontWeight: 600 }}>{formatDuration(duration)}</span>
            </div>
          )}
          {isConnecting && <span style={{ color: '#9aa5b1', fontSize: 13 }}>Connecting...</span>}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video area */}
        <div style={{ flex: 1, position: 'relative', background: '#0a0f0d' }}>
          {/* Remote video (main) */}
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {!isConnected && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 64 }}>🐾</div>
              <p style={{ color: 'white', fontSize: 18, fontWeight: 600 }}>
                {isConnecting ? 'Connecting to consultation...' : 'Waiting for the other participant...'}
              </p>
              <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'var(--primary)' }} />
            </div>
          )}
          {/* Local video (picture-in-picture) */}
          <div style={{ position: 'absolute', bottom: 24, right: 24, width: 160, height: 120, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid #1e2722', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 300, background: '#141a17', borderLeft: '1px solid #1e2722', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e2722' }}>
            {['Chat', user?.role === 'veterinarian' ? 'Records' : null, user?.role === 'veterinarian' ? 'Notes' : null].filter(Boolean).map(tab => (
              <button
                key={tab!}
                onClick={() => tab === 'Records' ? setShowRecords(true) : setShowRecords(false)}
                style={{
                  flex: 1, padding: '12px 8px', background: 'none', border: 'none',
                  color: '#9aa5b1', fontSize: 13, cursor: 'pointer', fontWeight: 500,
                  borderBottom: '2px solid transparent',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Chat */}
          {!showRecords && (
            <>
              <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatMessages.length === 0 && (
                  <p style={{ color: '#4a5568', fontSize: 13, textAlign: 'center', marginTop: 20 }}>Chat with the other participant</p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.isOwn ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      padding: '8px 12px', borderRadius: '12px',
                      background: msg.isOwn ? 'var(--primary)' : '#1e2722',
                      color: 'white', fontSize: 13, maxWidth: '80%',
                    }}>{msg.text}</div>
                  </div>
                ))}
                {user?.role === 'veterinarian' && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ color: '#9aa5b1', fontSize: 12, marginBottom: 6 }}>Consultation Notes</p>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Add notes, observations..."
                      style={{ width: '100%', background: '#1e2722', border: '1px solid #2d3748', borderRadius: 'var(--radius-md)', color: 'white', padding: '10px', fontSize: 12, resize: 'vertical', minHeight: 80 }}
                    />
                  </div>
                )}
              </div>
              <div style={{ padding: '12px', borderTop: '1px solid #1e2722', display: 'flex', gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  style={{ flex: 1, background: '#1e2722', border: '1px solid #2d3748', borderRadius: 'var(--radius-md)', color: 'white', padding: '8px 12px', fontSize: 13, outline: 'none' }}
                />
                <button onClick={sendChatMessage} style={{ background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', padding: '8px 14px', cursor: 'pointer', fontSize: 16 }}>→</button>
              </div>
            </>
          )}

          {/* Pet Records (vet only) */}
          {showRecords && (
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              <p style={{ color: '#9aa5b1', fontSize: 12, marginBottom: 12 }}>Patient Health Records</p>
              {petRecords.length === 0 ? (
                <p style={{ color: '#4a5568', fontSize: 13 }}>No records found</p>
              ) : (
                petRecords.map(record => (
                  <div key={record._id} style={{ background: '#1e2722', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: 8 }}>
                    <p style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{record.diagnosis || 'General'}</p>
                    <p style={{ color: '#9aa5b1', fontSize: 11, marginTop: 2 }}>{new Date(record.date).toLocaleDateString()}</p>
                    {record.treatment && <p style={{ color: '#9aa5b1', fontSize: 12, marginTop: 4 }}>{record.treatment}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '20px', background: '#141a17', borderTop: '1px solid #1e2722', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <button
          onClick={toggleMute}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: isMuted ? '#dc2626' : '#1e2722',
            border: 'none', cursor: 'pointer', fontSize: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>
        <button
          onClick={toggleVideo}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: isVideoOff ? '#dc2626' : '#1e2722',
            border: 'none', cursor: 'pointer', fontSize: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? '📵' : '📹'}
        </button>
        <button
          onClick={endCall}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(220, 38, 38, 0.4)',
            transition: 'all 0.2s ease',
          }}
          title="End call"
        >
          📵
        </button>
      </div>
    </div>
  );
}
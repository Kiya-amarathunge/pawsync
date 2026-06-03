'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function EmergencyPage() {
  const [services, setServices] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/emergency/services?lat=6.9271&lng=79.8612').then(r => r.json()),
      fetch('/api/emergency/resources').then(r => r.json()),
    ]).then(([svcData, resData]) => {
      setServices(svcData.services || []);
      setResources(resData.resources || []);
      setIsLoading(false);
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        {/* Emergency Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          color: 'white',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}>
          <div style={{ fontSize: 64 }}>🚨</div>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Emergency Services</h1>
            <p style={{ fontSize: 16, opacity: 0.9 }}>Find immediate veterinary care for your pet</p>
            <p style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>
              If your pet is in immediate danger, call the nearest emergency clinic directly
            </p>
          </div>
        </div>

        <div className="grid-2">
          {/* Nearest clinics */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>🏥 Nearest Emergency Clinics</h2>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
              </div>
            ) : services.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏥</div>
                <p className="empty-state-title">No clinics registered yet</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Contact your local vet directly</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {services.map((svc: any) => (
                  <div key={svc._id} style={{
                    padding: '16px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600 }}>{svc.name}</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{svc.address}</p>
                        <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginTop: 4 }}>📞 {svc.phone}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {svc.is24Hours && <span className="badge badge-green">24/7</span>}
                        {svc.distance && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{svc.distance} km away</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* First aid resources */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>🩺 First Aid Guide</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {resources.map((res: any) => (
                <div key={res.id} style={{
                  padding: '16px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{res.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{res.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
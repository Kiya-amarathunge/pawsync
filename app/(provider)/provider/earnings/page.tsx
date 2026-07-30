'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Download, LoaderCircle } from 'lucide-react';

export default function EarningsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [earnings, setEarnings] = useState<any>(null);
  const [period, setPeriod] = useState('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadReport = async () => {
    if (!token || isDownloading) return;

    setIsDownloading(true);
    try {
      const response = await fetch('/api/provider/dashboard/report', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Unable to generate appointment value report');
      }

      const blob = await response.blob();
      if (!blob.type.includes('application/pdf')) {
        throw new Error('The server did not return a valid PDF report');
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pawsync-appointment-value-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Appointment value report downloaded', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to download appointment value report', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch(`/api/provider/dashboard/earnings?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setEarnings(data); setIsLoading(false); });
  }, [token, period]);

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Estimated Earnings</h1>
            <p className="page-subtitle">Appointment values from completed services; PawSync does not process payments</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-secondary" disabled={isDownloading || !token} onClick={() => void downloadReport()}>{isDownloading ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />} {isDownloading ? 'Preparing report...' : 'Appointment value report'}</button><select className="input" style={{ maxWidth: 160 }} value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select></div>
        </div>

        {/* Total */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), #157a5a)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          color: 'white',
          marginBottom: 24,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 8, textTransform: 'capitalize' }}>{period} estimated total</p>
          <p style={{ fontSize: 48, fontWeight: 700 }}>
            {isLoading ? '...' : `Rs. ${(earnings?.total || 0).toLocaleString()}`}
          </p>
        </div>

        {/* Breakdown */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Appointment Value Breakdown</h2>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 40 }} />)}
            </div>
          ) : earnings?.labels?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <p className="empty-state-title">No completed appointment values yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {earnings?.labels?.map((label: string, i: number) => {
                const maxVal = Math.max(...(earnings.data || [1]));
                const pct = maxVal > 0 ? ((earnings.data[i] / maxVal) * 100) : 0;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 100, flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', width: 80, textAlign: 'right' }}>
                      Rs. {earnings.data[i].toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

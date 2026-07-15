'use client';
import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
interface Alert { type: string; severity: string; entityId?: string; message: string }
export default function SecurityAlertsPage() {
  const { token } = useAuth(); const { showToast } = useToast(); const [alerts, setAlerts] = useState<Alert[]>([]);
  const load = useCallback(async () => { if (!token) return; const response = await fetch('/api/admin/security/alerts', { headers: { Authorization: `Bearer ${token}` } }); const data = await response.json(); setAlerts(data.alerts || []); }, [token]);
  useEffect(() => { void load(); }, [load]);
  const suspend = async (id: string) => { const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'suspend', reason: 'Suspicious activity investigation' }) }); const data = await response.json(); showToast(response.ok ? data.message : data.error, response.ok ? 'success' : 'error'); };
  return <DashboardLayout><div style={{ marginBottom: 20 }}><h1 className="page-title">Security alerts</h1><p className="page-subtitle">Signals requiring administrator investigation</p></div><div style={{ display: 'grid', gap: 10 }}>{alerts.map((alert, index) => <article className="card" key={`${alert.type}-${index}`} style={{ padding: 16, borderLeft: `4px solid ${alert.severity === 'high' ? '#dc2626' : '#f59e0b'}` }}><div style={{ display: 'flex', gap: 9 }}><ShieldAlert size={19} /><div style={{ flex: 1 }}><strong>{alert.message}</strong><p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{alert.type.replaceAll('_', ' ')} · {alert.severity}</p></div>{alert.entityId && <button className="btn btn-danger btn-sm" onClick={() => void suspend(alert.entityId!)}>Suspend pending review</button>}</div></article>)}{alerts.length === 0 && <div className="empty-state"><p>No suspicious activity signals detected.</p></div>}</div></DashboardLayout>;
}

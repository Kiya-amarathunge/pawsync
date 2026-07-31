'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Pagination from '@/components/ui/Pagination';

export default function AuditLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (actionFilter) params.set('actionType', actionFilter);
    fetch(`/api/admin/audit-logs?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setPages(Math.max(1, data.pages || 1));
        setIsLoading(false);
      });
  }, [token, actionFilter, page]);

  const actionColors: Record<string, string> = {
    USER_SUSPENDED: 'badge-red', USER_ACTIVATED: 'badge-green',
    PROVIDER_APPROVED: 'badge-green', PROVIDER_REJECTED: 'badge-red',
    CONTENT_REMOVED: 'badge-orange', USER_WARNED: 'badge-orange',
    DISPUTE_RESOLVED: 'badge-blue', ANNOUNCEMENT_SENT: 'badge-blue',
    OUTBREAK_ALERT_SENT: 'badge-red', EMERGENCY_CONTACT: 'badge-orange',
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Audit Logs</h1>
            <p className="page-subtitle">Complete history of all admin actions</p>
          </div>
          <select className="input" style={{ maxWidth: 220 }} value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            <option value="USER_SUSPENDED">User Suspended</option>
            <option value="PROVIDER_APPROVED">Provider Approved</option>
            <option value="PROVIDER_REJECTED">Provider Rejected</option>
            <option value="CONTENT_REMOVED">Content Removed</option>
            <option value="DISPUTE_RESOLVED">Dispute Resolved</option>
          </select>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Admin</th>
                <th>Entity</th>
                <th>Justification</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No audit logs found</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id}>
                    <td><span className={`badge ${actionColors[log.actionType] || 'badge-gray'}`} style={{ fontSize: 11 }}>{log.actionType?.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontSize: 13 }}>{log.adminId?.name || 'System'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.affectedEntity}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 200 }}>{log.justification}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!isLoading && <Pagination page={page} pages={pages} total={total} itemLabel="audit logs" onPageChange={setPage} />}
        </div>
      </div>
    </DashboardLayout>
  );
}

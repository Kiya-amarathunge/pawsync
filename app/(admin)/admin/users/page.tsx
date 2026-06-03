'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AdminUsersPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [total, setTotal] = useState(0);

  const fetchUsers = async () => {
    if (!token) return;
    const params = roleFilter ? `?role=${roleFilter}` : '';
    const res = await fetch(`/api/admin/users${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setUsers(data.users || []);
    setTotal(data.total || 0);
    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [token, roleFilter]);

  const handleAction = async (userId: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, justification: `Admin ${action} action` }),
      });
      if (!res.ok) throw new Error('Action failed');
      showToast(`User ${action}ed successfully`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleManage = async (userId: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/manage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const roleColors: Record<string, string> = {
    pet_owner: 'badge-green', veterinarian: 'badge-blue',
    service_provider: 'badge-orange', admin: 'badge-gray',
  };

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">{total} total users on the platform</p>
          </div>
          <select className="input" style={{ maxWidth: 180 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="pet_owner">Pet Owners</option>
            <option value="veterinarian">Veterinarians</option>
            <option value="service_provider">Service Providers</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{user.name?.[0]}</div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${roleColors[user.role] || 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{user.role?.replace('_', ' ')}</span></td>
                    <td>
                      {user.isSuspended ? <span className="badge badge-red">Suspended</span> :
                       !user.isActive ? <span className="badge badge-orange">Inactive</span> :
                       !user.isVerified ? <span className="badge badge-gray">Unverified</span> :
                       <span className="badge badge-green">Active</span>}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(user.registrationDate).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {!user.isSuspended && user.role !== 'admin' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleAction(user._id, 'suspend')}>Suspend</button>
                        )}
                        {user.isSuspended && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleAction(user._id, 'activate')}>Activate</button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={() => handleManage(user._id, 'reset-password')}>Reset PW</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
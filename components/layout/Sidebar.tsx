'use client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const petOwnerNav = [
  { section: 'Main', items: [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/pets', icon: '🐾', label: 'My Pets' },
    { href: '/health-records', icon: '📋', label: 'Health Records' },
  ]},
  { section: 'Services', items: [
    { href: '/appointments', icon: '📅', label: 'Appointments' },
    { href: '/providers', icon: '🔍', label: 'Find Providers' },
    { href: '/consultations', icon: '💻', label: 'Telemedicine' },
  ]},
  { section: 'Community', items: [
    { href: '/messages', icon: '💬', label: 'Messages' },
    { href: '/forum', icon: '🌿', label: 'Community' },
    { href: '/emergency', icon: '🚨', label: 'Emergency' },
    { href: '/notifications', icon: '🔔', label: 'Notifications' },
  ]},
];

const veterinarianNav = [
  { section: 'Main', items: [
    { href: '/provider/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/provider/appointments', icon: '📅', label: 'Appointments' },
    { href: '/provider/clients', icon: '🐾', label: 'Patients' },
  ]},
  { section: 'Practice', items: [
    { href: '/provider/availability', icon: '🗓️', label: 'My Schedule' },
    { href: '/provider/reviews', icon: '⭐', label: 'Reviews' },
    { href: '/provider/earnings', icon: '💰', label: 'Earnings' },
  ]},
  { section: 'Communication', items: [
    { href: '/messages', icon: '💬', label: 'Messages' },
    { href: '/notifications', icon: '🔔', label: 'Notifications' },
  ]},
];

const serviceProviderNav = [
  { section: 'Main', items: [
    { href: '/provider/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/provider/appointments', icon: '📅', label: 'Bookings' },
    { href: '/provider/clients', icon: '👥', label: 'Clients' },
  ]},
  { section: 'Business', items: [
    { href: '/provider/availability', icon: '🗓️', label: 'Availability' },
    { href: '/provider/reviews', icon: '⭐', label: 'Reviews' },
    { href: '/provider/earnings', icon: '💰', label: 'Earnings' },
  ]},
  { section: 'Communication', items: [
    { href: '/messages', icon: '💬', label: 'Messages' },
    { href: '/notifications', icon: '🔔', label: 'Notifications' },
  ]},
];

const adminNav = [
  { section: 'Overview', items: [
    { href: '/admin/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/admin/analytics', icon: '📊', label: 'Analytics' },
  ]},
  { section: 'Management', items: [
    { href: '/admin/verifications', icon: '✅', label: 'Verifications' },
    { href: '/admin/moderation', icon: '🛡️', label: 'Moderation' },
    { href: '/admin/disputes', icon: '⚖️', label: 'Disputes' },
    { href: '/admin/users', icon: '👥', label: 'Users' },
  ]},
  { section: 'Tools', items: [
    { href: '/admin/announcements', icon: '📢', label: 'Announcements' },
    { href: '/admin/audit-logs', icon: '📜', label: 'Audit Logs' },
  ]},
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navSections =
    user?.role === 'admin' ? adminNav :
    user?.role === 'pet_owner' ? petOwnerNav :
    user?.role === 'veterinarian' ? veterinarianNav :
    serviceProviderNav;

  const roleLabel: Record<string, string> = {
    pet_owner: 'Pet Owner',
    veterinarian: 'Veterinarian',
    service_provider: 'Service Provider',
    admin: 'Administrator',
  };

  const roleColor: Record<string, string> = {
    pet_owner: '#1D9E75',
    veterinarian: '#378ADD',
    service_provider: '#FF6B35',
    admin: '#7c3aed',
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🐾</div>
        <span className="sidebar-logo-text">PawSync</span>
      </div>

      {/* Role badge */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 'var(--radius-full)',
          fontSize: 11, fontWeight: 700,
          background: `${roleColor[user?.role || 'pet_owner']}15`,
          color: roleColor[user?.role || 'pet_owner'],
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: roleColor[user?.role || 'pet_owner'],
          }} />
          {roleLabel[user?.role || 'pet_owner']}
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map(section => (
          <div key={section.section}>
            <p className="sidebar-section-title">{section.section}</p>
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div className="avatar" style={{
            background: `${roleColor[user?.role || 'pet_owner']}20`,
            color: roleColor[user?.role || 'pet_owner'],
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="btn btn-outline btn-sm btn-full">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
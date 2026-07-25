'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BadgeCheck, BarChart3, Bell, CalendarDays, CircleDollarSign, CircleHelp, ClipboardList, FileClock, Home, LogOut, Megaphone, MessageSquare, PawPrint, Search, Settings, ShieldAlert, ShieldCheck, Siren, Star, Users, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavItem { href: string; icon: LucideIcon; label: string }
interface NavSection { section: string; items: NavItem[] }

const petOwnerNav: NavSection[] = [
  { section: 'Workspace', items: [{ href: '/dashboard', icon: Home, label: 'Dashboard' }, { href: '/pets', icon: PawPrint, label: 'My Pets' }, { href: '/health-records', icon: ClipboardList, label: 'Health Records' }] },
  { section: 'Care', items: [{ href: '/appointments', icon: CalendarDays, label: 'Appointments' }, { href: '/providers', icon: Search, label: 'Find Providers' }] },
  { section: 'Connect', items: [{ href: '/messages', icon: MessageSquare, label: 'Messages' }, { href: '/disputes', icon: CircleHelp, label: 'Disputes' }, { href: '/forum', icon: Users, label: 'Community' }, { href: '/emergency', icon: Siren, label: 'Emergency' }, { href: '/notifications', icon: Bell, label: 'Notifications' }] },
];

const providerNav: NavSection[] = [
  { section: 'Workspace', items: [{ href: '/provider/dashboard', icon: Home, label: 'Dashboard' }, { href: '/provider/appointments', icon: CalendarDays, label: 'Appointments' }, { href: '/provider/clients', icon: PawPrint, label: 'Clients & Patients' }] },
  { section: 'Practice', items: [{ href: '/provider/profile', icon: Settings, label: 'Profile & Services' }, { href: '/provider/availability', icon: FileClock, label: 'Availability' }, { href: '/provider/reviews', icon: Star, label: 'Reviews' }, { href: '/provider/earnings', icon: CircleDollarSign, label: 'Earnings' }] },
  { section: 'Connect', items: [{ href: '/messages', icon: MessageSquare, label: 'Messages' }, { href: '/disputes', icon: CircleHelp, label: 'Disputes' }, { href: '/notifications', icon: Bell, label: 'Notifications' }] },
];

const adminNav: NavSection[] = [
  { section: 'Overview', items: [{ href: '/admin/dashboard', icon: Home, label: 'Dashboard' }, { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' }] },
  { section: 'Operations', items: [{ href: '/admin/verifications', icon: BadgeCheck, label: 'Verifications' }, { href: '/admin/emergency-services', icon: Siren, label: 'Emergency Services' }, { href: '/admin/moderation', icon: ShieldCheck, label: 'Moderation' }, { href: '/admin/disputes', icon: Activity, label: 'Disputes' }, { href: '/admin/users', icon: Users, label: 'Users' }, { href: '/admin/security', icon: ShieldAlert, label: 'Security Alerts' }] },
  { section: 'System', items: [{ href: '/admin/announcements', icon: Megaphone, label: 'Announcements' }, { href: '/admin/audit-logs', icon: FileClock, label: 'Audit Logs' }] },
];

export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const navSections = user?.role === 'admin' ? adminNav : user?.role === 'pet_owner' ? petOwnerNav : providerNav;
  const roleLabel: Record<string, string> = { pet_owner: 'Pet owner', veterinarian: 'Veterinarian', service_provider: 'Service provider', admin: 'Administrator' };
  const initials = user?.name?.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2) || '?';

  return <>
    {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-logo"><div className="sidebar-logo-icon"><PawPrint size={20} /></div><div><span className="sidebar-logo-text">PawSync</span><span className="sidebar-product-label">Care workspace</span></div><button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={19} /></button></div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navSections.map(section => <section key={section.section}><p className="sidebar-section-title">{section.section}</p>{section.items.map(item => { const Icon = item.icon; const dashboard = ['/dashboard', '/provider/dashboard', '/admin/dashboard'].includes(item.href); const active = pathname === item.href || (!dashboard && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={item.href} onClick={onClose} className={`sidebar-item ${active ? 'active' : ''}`}><span className="sidebar-item-icon"><Icon size={18} strokeWidth={1.8} /></span><span>{item.label}</span></Link>; })}</section>)}
      </nav>
      <div className="sidebar-account"><Link href="/profile" onClick={onClose} className="sidebar-user"><div className="avatar">{initials}</div><div className="sidebar-user-copy"><strong>{user?.name}</strong><span>{roleLabel[user?.role || 'pet_owner']}</span></div></Link><button onClick={logout} className="sidebar-logout" title="Sign out" aria-label="Sign out"><LogOut size={18} /></button></div>
    </aside>
  </>;
}

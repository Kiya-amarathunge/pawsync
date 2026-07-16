'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, PawPrint, Siren } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const isAdminPage = pathname.startsWith('/admin');
    const isProviderPage = pathname.startsWith('/provider');
    const isOwnerPage = ['/dashboard', '/pets', '/health-records', '/appointments', '/providers']
      .some(route => pathname === route || pathname.startsWith(`${route}/`));
    if (isAdminPage && user.role !== 'admin') {
      router.replace(user.role === 'pet_owner' ? '/dashboard' : '/provider/dashboard');
    } else if (isProviderPage && !['veterinarian', 'service_provider'].includes(user.role)) {
      router.replace(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } else if (isOwnerPage && user.role !== 'pet_owner') {
      router.replace(user.role === 'admin' ? '/admin/dashboard' : '/provider/dashboard');
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) return <div className="app-loading"><PawPrint size={30} /><div className="spinner spinner-dark" /></div>;
  if (!user) return null;
  const roleMismatch = (pathname.startsWith('/admin') && user.role !== 'admin')
    || (pathname.startsWith('/provider') && !['veterinarian', 'service_provider'].includes(user.role))
    || (['/dashboard', '/pets', '/health-records', '/appointments', '/providers']
      .some(route => pathname === route || pathname.startsWith(`${route}/`)) && user.role !== 'pet_owner');
  if (roleMismatch) return <div className="app-loading"><PawPrint size={30} /><div className="spinner spinner-dark" /></div>;

  return <div className="dashboard-shell">
    <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
    <header className="mobile-header"><button onClick={() => setNavigationOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><span><PawPrint size={18} /> PawSync</span></header>
    <main className="main-content"><div className="content-container">{children}</div></main>
    <Link href="/emergency" className="emergency-action" aria-label="Emergency services" title="Emergency services"><Siren size={20} /></Link>
  </div>;
}

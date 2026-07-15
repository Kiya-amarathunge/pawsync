'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, PawPrint, Siren } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  if (isLoading) return <div className="app-loading"><PawPrint size={30} /><div className="spinner spinner-dark" /></div>;
  if (!user) return null;

  return <div className="dashboard-shell">
    <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
    <header className="mobile-header"><button onClick={() => setNavigationOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><span><PawPrint size={18} /> PawSync</span></header>
    <main className="main-content"><div className="content-container">{children}</div></main>
    <Link href="/emergency" className="emergency-action" aria-label="Emergency services" title="Emergency services"><Siren size={20} /></Link>
  </div>;
}

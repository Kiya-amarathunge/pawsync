'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐾</div>
          <div className="spinner spinner-dark" style={{ margin: '0 auto' }}></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
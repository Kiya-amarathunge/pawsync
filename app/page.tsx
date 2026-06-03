'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === 'pet_owner') router.push('/dashboard');
        else if (user.role === 'admin') router.push('/admin/dashboard');
        else router.push('/provider/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🐾</div>
        <p style={{ fontSize: 16, color: 'var(--text-muted)' }}>Loading PawSync...</p>
      </div>
    </div>
  );
}
'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'pet_owner' | 'veterinarian' | 'service_provider' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('pawsync_token');
    const savedUser = localStorage.getItem('pawsync_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setUser(data.user);
    setToken(data.accessToken);
    localStorage.setItem('pawsync_token', data.accessToken);
    localStorage.setItem('pawsync_user', JSON.stringify(data.user));
    if (data.user.role === 'pet_owner') router.push('/dashboard');
    else if (data.user.role === 'veterinarian') router.push('/provider/dashboard');
    else if (data.user.role === 'service_provider') router.push('/provider/dashboard');
    else if (data.user.role === 'admin') router.push('/admin/dashboard');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pawsync_token');
    localStorage.removeItem('pawsync_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
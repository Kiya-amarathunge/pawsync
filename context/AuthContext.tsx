'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
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
  updateCurrentUser: (updates: Pick<User, 'name'>) => void;
  logout: () => void;
  isLoading: boolean;
}

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const AuthContext = createContext<AuthContextType | null>(null);

// JWT expiry is read on the client only to schedule a refresh. The server still
// performs the authoritative signature and expiry validation.
function tokenExpiresAt(accessToken: string) {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1])) as { exp?: number };
    return (payload.exp || 0) * 1000;
  } catch {
    return 0;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pawsync_token');
    localStorage.removeItem('pawsync_user');
    localStorage.removeItem('pawsync_last_activity');
  }, []);

  // Restore a previous browser session unless it has exceeded the inactivity limit.
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('pawsync_token');
      const savedUser = localStorage.getItem('pawsync_user');
      const lastActivity = Number(localStorage.getItem('pawsync_last_activity') || 0);
      const isInactive = lastActivity > 0 && Date.now() - lastActivity > INACTIVITY_LIMIT_MS;
      if (savedToken && savedUser && !isInactive) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToken(savedToken);
        setUser(JSON.parse(savedUser) as User);
      } else if (isInactive) {
        localStorage.removeItem('pawsync_token');
        localStorage.removeItem('pawsync_user');
        localStorage.removeItem('pawsync_last_activity');
      }
    } catch {
      localStorage.removeItem('pawsync_token');
      localStorage.removeItem('pawsync_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Record user activity at most once every 15 seconds to avoid excessive storage writes.
  useEffect(() => {
    if (!token) return;
    let lastWrite = 0;
    const markActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 15_000) {
        localStorage.setItem('pawsync_last_activity', String(now));
        lastWrite = now;
      }
    };
    const events: Array<keyof WindowEventMap> = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, markActivity, { passive: true }));
    markActivity();
    const timer = window.setInterval(() => {
      const lastActivity = Number(localStorage.getItem('pawsync_last_activity') || 0);
      if (lastActivity && Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
        clearSession();
        router.replace('/login?reason=inactive');
      }
    }, 30_000);
    return () => {
      events.forEach(event => window.removeEventListener(event, markActivity));
      window.clearInterval(timer);
    };
  }, [clearSession, router, token]);

  // Refresh shortly before expiry so an active user is not interrupted mid-task.
  useEffect(() => {
    if (!token) return;
    const refresh = async () => {
      if (tokenExpiresAt(token) - Date.now() > 5 * 60 * 1000) return;
      const response = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!response.ok) {
        clearSession();
        router.replace('/login?reason=expired');
        return;
      }
      const data = await response.json();
      setToken(data.accessToken);
      localStorage.setItem('pawsync_token', data.accessToken);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [clearSession, router, token]);

  const persistSession = (userData: User, accessToken: string) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('pawsync_token', accessToken);
    localStorage.setItem('pawsync_user', JSON.stringify(userData));
    localStorage.setItem('pawsync_last_activity', String(Date.now()));
  };

  const redirectForRole = (role: User['role']) => {
    // Each role enters the application through its own dashboard.
    if (role === 'pet_owner') router.push('/dashboard');
    else if (role === 'admin') router.push('/admin/dashboard');
    else router.push('/provider/dashboard');
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const userData: User = {
      id: data.user.id || data.user._id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
    };
    persistSession(userData, data.accessToken);
    redirectForRole(userData.role);
  };

  const logout = () => {
    void fetch('/api/auth/logout', { method: 'POST' });
    clearSession();
    router.push('/login');
  };

  const updateCurrentUser = (updates: Pick<User, 'name'>) => {
    setUser(current => {
      if (!current) return current;
      const updated = { ...current, ...updates };
      localStorage.setItem('pawsync_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, updateCurrentUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

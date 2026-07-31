'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, CircleX, Info } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(0);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    // The sequence prevents collisions when several responses arrive in the same millisecond.
    const id = `${Date.now()}-${nextToastId.current++}`;
    setToasts(previous => [...previous, { id, message, type }]);
    window.setTimeout(() => {
      setToasts(previous => previous.filter(toast => toast.id !== id));
    }, 4000);
  }, []);

  const icons = { success: CircleCheck, error: CircleX, info: Info };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          return (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <Icon size={17} aria-hidden="true" />
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Trophy, ArrowUpCircle } from 'lucide-react';
import { vibrate } from '../lib/utils';

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'level_up' | 'milestone' | 'daily_reward';
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    vibrate([100, 100, 100]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-24 left-0 right-0 z-[200] flex flex-col items-center pointer-events-none px-4 space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              layout
              className={`w-full max-w-sm border p-4 shadow-2xl flex items-center gap-4 bg-[var(--bg-card)]/95 backdrop-blur-md pointer-events-auto ${
                toast.type === 'level_up' 
                  ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                  : 'border-[var(--accent-secondary)]/50 shadow-[0_0_20px_rgba(217,70,239,0.2)]'
              }`}
            >
              <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center bg-[var(--bg-base)] border ${
                toast.type === 'level_up' ? 'border-amber-400 text-amber-400' : 'border-fuchsia-400 text-[var(--accent-secondary-light)]'
              }`}>
                {toast.type === 'level_up' ? <ArrowUpCircle size={24} /> : <Trophy size={24} />}
              </div>
              <div>
                <h4 className={`text-[10px] font-bold uppercase tracking-widest ${
                  toast.type === 'level_up' ? 'text-amber-400' : 'text-[var(--accent-secondary-light)]'
                }`}>
                  Achievement Unlocked
                </h4>
                <p className="text-sm font-semibold text-slate-100 uppercase tracking-wide">{toast.title}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

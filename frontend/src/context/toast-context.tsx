import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

type ToastVariant = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends Required<ToastInput> {
  id: string;
}

interface ToastContextValue {
  pushToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((toast: ToastInput) => {
    const item: ToastItem = {
      id: globalThis.crypto.randomUUID(),
      title: toast.title,
      description: toast.description || '',
      variant: toast.variant || 'info',
    };

    setToasts((current) => [item, ...current].slice(0, 4));
    window.setTimeout(() => removeToast(item.id), 3500);
  }, [removeToast]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.variant];
          return (
            <div
              key={toast.id}
              className={cn(
                'animate-fadeInUp rounded-2xl border bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur',
                toast.variant === 'success' && 'border-emerald-500/40',
                toast.variant === 'error' && 'border-rose-500/40',
                toast.variant === 'info' && 'border-sky-500/40'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5 rounded-xl p-2', toast.variant === 'success' && 'bg-emerald-500/15 text-emerald-300', toast.variant === 'error' && 'bg-rose-500/15 text-rose-300', toast.variant === 'info' && 'bg-sky-500/15 text-sky-300')}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{toast.title}</p>
                  {toast.description ? <p className="mt-1 text-sm text-slate-300">{toast.description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  ×
                </button>
              </div>
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
import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export function PageShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50 sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 shadow-[0_10px_40px_rgba(15,23,42,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] backdrop-blur', className)}>{children}</div>;
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-5 sm:p-6', className)}>{children}</div>;
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; isLoading?: boolean }
>(function Button({ className, children, variant = 'primary', isLoading = false, disabled, ...props }, ref) {
  const styles = {
    primary: 'bg-slate-950 dark:bg-brand-600 text-white shadow-glow hover:-translate-y-0.5 hover:bg-slate-900 dark:hover:bg-brand-500',
    secondary: 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-600',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        styles[variant],
        className
      )}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-950 dark:text-slate-50 shadow-sm outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900', className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-950 dark:text-slate-50 shadow-sm outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn('w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-950 dark:text-slate-50 shadow-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900', className)} {...props} />;
});

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'purple' }) {
  const classes = {
    neutral: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    brand: 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 ring-1 ring-brand-100 dark:ring-brand-800/50',
    success: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-100 dark:ring-emerald-800/50',
    warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-100 dark:ring-amber-800/50',
    danger: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 ring-1 ring-rose-100 dark:ring-rose-800/50',
    purple: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 ring-1 ring-violet-100 dark:ring-violet-800/50',
  } as const;

  return <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', classes[tone])}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-700/80', className)} />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 p-10 text-center">
      <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
      {description ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Scroll body to top every time modal opens
  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 pt-6 pb-10">
      <button type="button" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-label="Close modal" />
      <div className="relative z-[71] w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/40 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl animate-fadeInUp">
        <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        <div ref={bodyRef} className="max-h-[calc(100vh-12rem)] overflow-y-auto px-6 py-6">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
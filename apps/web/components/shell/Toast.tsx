'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Apex Toast
 * - Top-right on desktop, top-center on mobile
 * - glass-medium surface
 * - Auto-dismiss at 4s with a thin progress bar
 * - Stackable up to 3 (older ones drop)
 * - Variants: info / success / warning / error / breaking
 *
 * Usage:
 *   <ToastProvider>...app...</ToastProvider>
 *   const { push } = useToast();
 *   push({ variant: 'breaking', title: 'Yellow flag · sector 2', desc: 'Lap 34' });
 */

type Variant = 'info' | 'success' | 'warning' | 'error' | 'breaking';

type ToastInput = {
  variant?: Variant;
  title: string;
  desc?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: string; createdAt: number };

const ToastCtx = createContext<{
  push: (t: ToastInput) => string;
  dismiss: (id: string) => void;
} | null>(null);

const MAX_STACK = 3;
const DEFAULT_DURATION = 4000;

const variantStyles: Record<Variant, { icon: string; accent: string; ring: string }> = {
  info:     { icon: 'info',                accent: 'text-on-surface-variant', ring: 'border-outline-variant/60' },
  success:  { icon: 'check_circle',        accent: 'text-[#7dd47d]',          ring: 'border-[#7dd47d]/40' },
  warning:  { icon: 'warning',             accent: 'text-[#f4c75a]',          ring: 'border-[#f4c75a]/40' },
  error:    { icon: 'error',               accent: 'text-[#ff8a80]',          ring: 'border-[#ff8a80]/40' },
  breaking: { icon: 'priority_high',       accent: 'text-telemetry-red',      ring: 'border-telemetry-red/60' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((input: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      const next = [...prev, { ...input, id, createdAt: Date.now() }];
      return next.slice(-MAX_STACK);
    });
    return id;
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      data-shell="toast-viewport"
      className="pointer-events-none fixed top-4 left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2 md:left-auto md:right-6 md:top-6 md:w-[380px] md:translate-x-0"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const v = variantStyles[toast.variant ?? 'info'];
  const duration = toast.duration ?? DEFAULT_DURATION;
  const [hover, setHover] = useState(false);
  const startedAt = useRef(Date.now());
  const remaining = useRef(duration);

  useEffect(() => {
    if (hover) {
      remaining.current = remaining.current - (Date.now() - startedAt.current);
      return;
    }
    startedAt.current = Date.now();
    const id = window.setTimeout(onDismiss, remaining.current);
    return () => window.clearTimeout(id);
  }, [hover, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ duration: 0.28, ease: [0.215, 0.61, 0.355, 1] }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`glass-medium pointer-events-auto relative overflow-hidden border ${v.ring}`}
      role="status"
      aria-live={toast.variant === 'breaking' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className={`material-symbols-outlined mt-0.5 text-[20px] ${v.accent}`}>
          {v.icon}
        </span>
        <div className="flex-1">
          <p className="font-headline text-[14.5px] font-semibold leading-[1.35] text-on-background">
            {toast.title}
          </p>
          {toast.desc && (
            <p className="mt-1 font-headline text-[13px] leading-[1.45] text-on-surface-variant">
              {toast.desc}
            </p>
          )}
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className={`mt-2 font-data text-[11px] tracking-[0.18em] ${v.accent} hover:text-on-background`}
            >
              {toast.action.label.toUpperCase()}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 flex h-6 w-6 items-center justify-center text-outline transition-colors hover:text-on-background"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      {/* Progress bar */}
      <motion.div
        key={hover ? 'paused' : 'running'}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: hover ? 1 : 0 }}
        transition={{ duration: hover ? 0 : remaining.current / 1000, ease: 'linear' }}
        style={{ originX: 0 }}
        className={`absolute bottom-0 left-0 h-[2px] w-full ${
          toast.variant === 'breaking' ? 'bg-telemetry-red' : 'bg-on-background/60'
        }`}
      />
    </motion.div>
  );
}

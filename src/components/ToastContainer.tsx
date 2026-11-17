// (2026-07-13) Add global Toast system above bottom nav per SKILL.md
import React from 'react';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'danger';
  icon?: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="global-toast-stack" // Global toast stack above nav
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 w-[92%] max-w-[420px] pointer-events-none no-print"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className="pointer-events-auto modal-animate-in flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-primary-container text-surface-bright shadow-lg border border-tertiary-fixed-dim/40 cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="material-symbols-outlined text-[19px] text-tertiary-fixed-dim shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {toast.icon ||
                (toast.type === 'warning'
                  ? 'info'
                  : toast.type === 'danger'
                    ? 'error'
                    : 'verified')}
            </span>
            <span className="font-body-sm text-body-sm font-medium tracking-wide truncate-single">
              {toast.message}
            </span>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-primary-container shrink-0">
            close
          </span>
        </div>
      ))}
    </div>
  );
};

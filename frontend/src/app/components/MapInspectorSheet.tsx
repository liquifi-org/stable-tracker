import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function MapInspectorSheet({
  open,
  onOpenChange,
  title,
  children,
  overlay = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  overlay?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className={
        overlay
          ? 'fixed inset-x-0 bottom-0 z-50 flex max-h-[40dvh] flex-col rounded-t-2xl border-t border-slate-200/60 dark:border-neutral-700 bg-white dark:bg-neutral-800 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_rgba(15,23,42,0.18)]'
          : 'flex max-h-[52dvh] flex-col rounded-xl border border-slate-200/50 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden'
      }
    >
      <div className="flex items-center justify-between gap-2 px-2 pt-1.5 shrink-0">
        <p className="min-w-0 truncate px-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <button
          type="button"
          aria-label="Close details"
          onClick={() => onOpenChange(false)}
          className="h-11 w-11 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}

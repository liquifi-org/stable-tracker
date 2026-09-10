import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

const HEIGHTS = ['28dvh', '52dvh', '84dvh'] as const;

export function MapInspectorSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const [snap, setSnap] = useState(1);

  useEffect(() => {
    if (open) setSnap(1);
  }, [open, title]);

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
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-slate-200/60 dark:border-neutral-700 bg-white dark:bg-neutral-800 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_rgba(15,23,42,0.18)]"
      style={{ height: HEIGHTS[snap] }}
    >
      <div className="relative flex items-center justify-end px-2 pt-1.5 shrink-0">
        <button
          type="button"
          aria-label="Resize details"
          onClick={() => setSnap((s) => (s + 1) % HEIGHTS.length)}
          className="absolute left-1/2 -translate-x-1/2 h-8 w-16 flex items-center justify-center"
        >
          <span className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-neutral-600" />
        </button>
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

import { useEffect, useState, type ReactNode } from 'react';
import { Drawer } from 'vaul';

const SNAP = [0.28, 0.52, 0.92] as const;

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
  const [snap, setSnap] = useState<number | string | null>(SNAP[1]);

  useEffect(() => {
    if (open) setSnap(SNAP[1]);
  }, [open, title]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      handleOnly
      snapPoints={[...SNAP]}
      fadeFromIndex={2}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-transparent pointer-events-none" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border-t border-slate-200/60 dark:border-neutral-700 bg-white dark:bg-neutral-800 outline-none pb-[env(safe-area-inset-bottom)]">
          <Drawer.Handle className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-neutral-600" />
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

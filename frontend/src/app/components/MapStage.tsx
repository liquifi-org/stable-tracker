import { useEffect, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2, Minus, Plus, RotateCcw, Search } from 'lucide-react';
import { useCompactMap } from '../hooks/useMediaQuery';
import { openCountrySearch } from '../lib/mapEvents';

export const MAP_SVG_CLASS =
  'w-full touch-none overscroll-none select-none h-[min(58dvh,22rem)] md:h-[min(62dvh,28rem)] lg:h-auto lg:aspect-[8/3]';
export const MAP_SVG_FULLSCREEN_CLASS =
  'w-full h-dvh touch-none overscroll-none select-none';

const REGION_JUMPS = [
  { id: 'Americas', label: 'Americas' },
  { id: 'EMEIA', label: 'EMEIA' },
  { id: 'APAC', label: 'APAC' },
] as const;

export function MapStageFrame({
  fullscreen,
  children,
}: {
  fullscreen: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[45] bg-[#F7FAFC] dark:bg-neutral-900'
          : 'bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/50 dark:border-neutral-700 overflow-hidden transition-ui'
      }
    >
      <div
        className={
          fullscreen
            ? 'relative h-dvh bg-[#F7FAFC] dark:bg-neutral-900'
            : 'relative px-2 py-2 sm:px-5 sm:py-3 bg-[#F7FAFC] dark:bg-neutral-900 touch-none'
        }
      >
        {children}
      </div>
    </div>
  );
}

export function MapZoomCluster({
  zoom,
  minZoom,
  maxZoom,
  onZoomIn,
  onZoomOut,
  onReset,
  fullscreen,
  onToggleFullscreen,
}: {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const compact = useCompactMap();
  const size = compact ? 'w-11 h-11' : 'w-8 h-8';
  const btn =
    `${size} flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-ui`;

  return (
    <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 sm:right-4 flex flex-col gap-1 z-10">
      <button type="button" onClick={onZoomIn} disabled={zoom >= maxZoom} aria-label="Zoom in" className={btn}>
        <Plus className="w-4 h-4" />
      </button>
      <button type="button" onClick={onZoomOut} disabled={zoom <= minZoom} aria-label="Zoom out" className={btn}>
        <Minus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={zoom <= minZoom}
        aria-label="Reset map view"
        title="Reset map view"
        className={btn}
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onToggleFullscreen}
        aria-label={fullscreen ? 'Exit full screen' : 'Full screen map'}
        title={fullscreen ? 'Exit full screen' : 'Full screen map'}
        className={btn}
      >
        {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function MapFindButton() {
  const compact = useCompactMap();
  if (!compact) return null;
  return (
    <button
      type="button"
      onClick={openCountrySearch}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-neutral-800/95 border border-slate-200/60 dark:border-neutral-700 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200"
    >
      <Search className="w-3.5 h-3.5" />
      Find a country
    </button>
  );
}

export function MapRegionJumps({
  onJump,
}: {
  onJump: (id: (typeof REGION_JUMPS)[number]['id']) => void;
}) {
  const compact = useCompactMap();
  if (!compact) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {REGION_JUMPS.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onJump(r.id)}
          className="rounded-full bg-white/90 dark:bg-neutral-800/90 border border-slate-200/60 dark:border-neutral-700 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300"
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function MapLegendFold({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const compact = useCompactMap();
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? !compact;

  return (
    <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-slate-200/60 dark:border-neutral-700 rounded-lg max-w-[13.5rem]">
      <button
        type="button"
        onClick={() => setUserOpen(!(userOpen ?? !compact))}
        className="w-full text-left px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
        aria-expanded={open}
      >
        {open ? title : `${title} · legend`}
      </button>
      {open && <div className="px-2.5 pb-2.5 space-y-2.5">{children}</div>}
    </div>
  );
}

export function MapDisambiguateList({
  items,
  x,
  y,
  onPick,
  onDismiss,
}: {
  items: { id: string; label: string }[];
  x: number;
  y: number;
  onPick: (id: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="absolute z-30 min-w-[10rem] max-w-[16rem] rounded-lg border border-slate-200/70 dark:border-neutral-600 bg-white dark:bg-neutral-800 py-1"
      style={{ left: Math.max(8, x - 8), top: Math.max(8, y + 12) }}
    >
      <p className="px-2.5 py-1 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Did you mean
      </p>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPick(item.id)}
          className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-neutral-700"
        >
          {item.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onDismiss}
        className="w-full text-left px-2.5 py-1.5 text-[11px] text-slate-500 dark:text-slate-400"
      >
        Cancel
      </button>
    </div>
  );
}

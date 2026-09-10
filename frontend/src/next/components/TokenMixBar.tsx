import { CountryFlag } from '../../app/components/CountryFlag';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../app/components/ui/hover-card';
import type { CSSProperties } from 'react';

export interface TokenShare {
  name: string;
  volume: number;
}

function displayTokens(items: TokenShare[]): { total: number; display: TokenShare[] } {
  const total = items.reduce((s, i) => s + i.volume, 0);
  if (total <= 0 || items.length === 0) return { total: 0, display: [] };
  const sorted = [...items].sort((a, b) => b.volume - a.volume);
  const named = sorted.filter((i) => i.name !== 'Other').slice(0, 4);
  const namedVol = named.reduce((s, i) => s + i.volume, 0);
  const rest = total - namedVol;
  const display = rest > total * 0.02 ? [...named, { name: 'Other', volume: rest }] : named;
  return { total, display };
}

function hexToRgba(hex: string, alpha: number): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function tokenColor(name: string, alpha = 1): string {
  const key = name.toUpperCase();
  let hex = '#6b8fc4';
  if (key === 'USDT' || key === 'USDT0') hex = '#2f8f6d';
  else if (key === 'USDC') hex = '#3b6ea8';
  else if (key === 'EURC' || key === 'EUR') hex = '#3d5f9e';
  else if (key === 'PYUSD') hex = '#2a4a7a';
  else if (key === 'OTHER') hex = '#94a3b8';
  return alpha >= 1 ? hex : hexToRgba(hex, alpha);
}

const STRIP_FILL = 0.48;
const SWATCH_FILL = 0.78;

function TokenMixLegend({
  display,
  total,
  formatVolume,
}: {
  display: TokenShare[];
  total: number;
  formatVolume?: (n: number) => string;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ink-text)]">
      {display.map((item) => (
        <span key={item.name} className="inline-flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-sm"
            style={{ backgroundColor: tokenColor(item.name, SWATCH_FILL) }}
          />
          {item.name} {((item.volume / total) * 100).toFixed(0)}%
          {formatVolume ? ` · ${formatVolume(item.volume)}` : ''}
        </span>
      ))}
    </div>
  );
}

export function TokenMixStrip({
  items,
  className = '',
  style,
}: {
  items: TokenShare[];
  className?: string;
  style?: CSSProperties;
}) {
  const { total, display } = displayTokens(items);
  return (
    <div
      className={`flex rounded-full overflow-hidden bg-slate-200/80 dark:bg-neutral-800 ${className || 'h-2'}`}
      style={style}
    >
      {total > 0 &&
        display.map((item) => (
          <div
            key={item.name}
            className="h-full first:rounded-l-full last:rounded-r-full min-w-[2px]"
            style={{
              width: `${(item.volume / total) * 100}%`,
              backgroundColor: tokenColor(item.name, STRIP_FILL),
            }}
          />
        ))}
    </div>
  );
}

export function TokenMixBar({ items, formatVolume }: { items: TokenShare[]; formatVolume: (n: number) => string }) {
  const { total, display } = displayTokens(items);
  if (total <= 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No token mix for this period.</p>;
  }

  return (
    <div className="space-y-2">
      <TokenMixStrip items={items} className="h-2.5" />
      <TokenMixLegend display={display} total={total} formatVolume={formatVolume} />
    </div>
  );
}

export function NamedCorridorDestRow({
  name,
  alpha,
  volume,
  tokens,
  formatVolume,
  onClick,
  barShare = 1,
}: {
  name: string;
  alpha?: string;
  volume: number;
  tokens?: TokenShare[];
  formatVolume: (n: number) => string;
  onClick?: () => void;
  /** Share of the largest dest in this origin (0–1). Sizes the strip. */
  barShare?: number;
}) {
  const { total, display } = displayTokens(tokens ?? []);
  const widthPct = Math.max(0.04, Math.min(1, barShare)) * 100;
  const cls = onClick
    ? 'w-full text-left hover:bg-[var(--paper)] cursor-pointer'
    : 'w-full text-left';
  const row = (
    <button type="button" onClick={onClick} className={`${cls} flex items-center gap-3 py-1.5 pl-2 pr-1.5 rounded-lg transition-ui`}>
      <div className="flex items-center gap-1.5 min-w-0 w-[11rem] sm:w-[14rem] shrink-0">
        <span className="text-[var(--muted-ink)] shrink-0">→</span>
        {alpha && <CountryFlag isoAlpha2={alpha} className="w-4 h-4" />}
        <span className="truncate text-sm text-[var(--ink-text)]">{name}</span>
      </div>
      <div className="flex-1 min-w-[4rem]">
        <TokenMixStrip items={tokens ?? []} className="h-2 min-w-[1.25rem]" style={{ width: `${widthPct}%` }} />
      </div>
      <div className="text-sm tabular-nums text-[var(--ink-text)] shrink-0 w-[4.5rem] text-right">{formatVolume(volume)}</div>
    </button>
  );

  if (total <= 0) return row;

  return (
    <HoverCard openDelay={0} closeDelay={80}>
      <HoverCardTrigger asChild>{row}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        sideOffset={6}
        collisionPadding={12}
        className="w-auto max-w-[min(28rem,calc(100vw-2rem))] p-3 bg-[var(--paper-raised)] text-[var(--ink-text)] border-[var(--hairline)]"
      >
        <TokenMixLegend display={display} total={total} formatVolume={formatVolume} />
      </HoverCardContent>
    </HoverCard>
  );
}

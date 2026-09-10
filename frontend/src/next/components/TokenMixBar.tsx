import { CountryFlag } from '../../app/components/CountryFlag';

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

export function tokenColor(name: string): string {
  const key = name.toUpperCase();
  if (key === 'USDT' || key === 'USDT0') return '#26a17b';
  if (key === 'USDC') return '#2775ca';
  if (key === 'EURC' || key === 'EUR') return '#1a4fd6';
  if (key === 'PYUSD') return '#003087';
  if (key === 'OTHER') return '#94a3b8';
  return '#6f9aed';
}

export function TokenMixStrip({
  items,
  className = '',
}: {
  items: TokenShare[];
  className?: string;
}) {
  const { total, display } = displayTokens(items);
  return (
    <div className={`flex rounded-full overflow-hidden bg-slate-200 dark:bg-neutral-700 ${className || 'h-2'}`}>
      {total > 0 &&
        display.map((item) => (
          <div
            key={item.name}
            title={`${item.name} ${((item.volume / total) * 100).toFixed(1)}%`}
            className="h-full first:rounded-l-full last:rounded-r-full min-w-[2px]"
            style={{
              width: `${(item.volume / total) * 100}%`,
              backgroundColor: tokenColor(item.name),
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
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        {display.map((item) => (
          <span key={item.name} className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: tokenColor(item.name) }} />
            {item.name} {((item.volume / total) * 100).toFixed(0)}% · {formatVolume(item.volume)}
          </span>
        ))}
      </div>
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
}: {
  name: string;
  alpha?: string;
  volume: number;
  tokens?: TokenShare[];
  formatVolume: (n: number) => string;
  onClick?: () => void;
}) {
  const cls = onClick
    ? 'w-full text-left hover:bg-[var(--paper)] cursor-pointer'
    : 'w-full text-left';
  return (
    <button type="button" onClick={onClick} className={`${cls} flex items-center gap-3 py-1.5 pl-2 pr-1.5 rounded-lg transition-ui`}>
      <div className="flex items-center gap-1.5 min-w-0 w-[11rem] sm:w-[14rem] shrink-0">
        <span className="text-[var(--muted-ink)] shrink-0">→</span>
        {alpha && <CountryFlag isoAlpha2={alpha} className="w-4 h-4" />}
        <span className="truncate text-sm text-[var(--ink-text)]">{name}</span>
      </div>
      <TokenMixStrip items={tokens ?? []} className="h-2 flex-1 min-w-[4rem]" />
      <div className="text-sm tabular-nums text-[var(--ink-text)] shrink-0 w-[4.5rem] text-right">{formatVolume(volume)}</div>
    </button>
  );
}

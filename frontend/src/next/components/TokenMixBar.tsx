import { CountryFlag } from '../../app/components/CountryFlag';

interface TokenShare {
  name: string;
  volume: number;
}

export function TokenMixBar({ items, formatVolume }: { items: TokenShare[]; formatVolume: (n: number) => string }) {
  const total = items.reduce((s, i) => s + i.volume, 0);
  if (total <= 0 || items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No token mix for this period.</p>;
  }

  const sorted = [...items].sort((a, b) => b.volume - a.volume);
  const named = sorted.filter((i) => i.name !== 'Other').slice(0, 4);
  const namedVol = named.reduce((s, i) => s + i.volume, 0);
  const rest = total - namedVol;
  const display = rest > total * 0.02 ? [...named, { name: 'Other', volume: rest }] : named;

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-200 dark:bg-neutral-700">
        {display.map((item) => (
          <div
            key={item.name}
            title={`${item.name} ${((item.volume / total) * 100).toFixed(1)}%`}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(item.volume / total) * 100}%`,
              backgroundColor: tokenColor(item.name),
            }}
          />
        ))}
      </div>
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

function tokenColor(name: string): string {
  const key = name.toUpperCase();
  if (key === 'USDT') return '#26a17b';
  if (key === 'USDC') return '#2775ca';
  if (key === 'EURC' || key === 'EUR') return '#1a4fd6';
  if (key === 'PYUSD') return '#003087';
  if (key === 'OTHER') return '#94a3b8';
  return '#6f9aed';
}

export function NamedCorridorRow({
  left,
  right,
  leftAlpha,
  rightAlpha,
  volume,
  leftShare,
  formatVolume,
  onClick,
}: {
  left: string;
  right: string;
  leftAlpha?: string;
  rightAlpha?: string;
  volume: number;
  leftShare: number;
  formatVolume: (n: number) => string;
  onClick?: () => void;
}) {
  const cls = onClick
    ? 'w-full text-left hover:bg-[var(--paper)] cursor-pointer'
    : 'w-full text-left';
  return (
    <button type="button" onClick={onClick} className={`${cls} flex items-center gap-3 py-2.5 px-1.5 rounded-lg transition-ui`}>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {leftAlpha && <CountryFlag isoAlpha2={leftAlpha} className="w-4 h-4" />}
        <span className="truncate text-sm font-medium text-[var(--ink-text)]">{left}</span>
        <span className="text-[var(--muted-ink)] shrink-0">→</span>
        {rightAlpha && <CountryFlag isoAlpha2={rightAlpha} className="w-4 h-4" />}
        <span className="truncate text-sm font-medium text-[var(--ink-text)]">{right}</span>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm tabular-nums font-medium">{formatVolume(volume)}</div>
        <div className="text-[10px] text-[var(--muted-ink)]">{(leftShare * 100).toFixed(0)}% from {leftAlpha ?? left}</div>
      </div>
    </button>
  );
}

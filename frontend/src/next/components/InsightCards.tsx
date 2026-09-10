import { useState, type ReactNode } from 'react';
import { Wallet, ArrowLeftRight, Percent, DollarSign } from 'lucide-react';
import { TrendBadge } from '../../app/components/TrendBadge';
import { AnimatedNumber } from '../../app/components/AnimatedNumber';
import { Skeleton } from '../../app/components/ui/skeleton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../app/components/ui/hover-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../app/components/ui/dialog';
import { useFinePointer } from '../../app/hooks/useMediaQuery';
import { fmtPct } from '../lib/format';

export interface InsightBreakdownRow {
  label: string;
  value: string;
  share?: number;
}

export interface InsightBreakdown {
  bar?: { key: string; share: number }[];
  caption?: string;
  rows: InsightBreakdownRow[];
  note?: string;
}

export function InsightCards({
  periodLabel,
  loading,
  corridorLoading,
  wallets,
  walletsTrend,
  walletBreakdown,
  corridorVolume,
  corridorTrend,
  corridorBreakdown,
  dollarization,
  dollarizationTrendPp,
  dollarizationBreakdown,
  outflowRatio,
  outflowTrendPp,
  outflowBreakdown,
  onSelectUsage,
  formatCurrency,
}: {
  periodLabel: string;
  loading: boolean;
  corridorLoading: boolean;
  wallets: number | undefined;
  walletsTrend: number | null;
  walletBreakdown: InsightBreakdown | null;
  corridorVolume: number;
  corridorTrend: number | null;
  corridorBreakdown: InsightBreakdown | null;
  dollarization: number | null;
  dollarizationTrendPp: number | null;
  dollarizationBreakdown: InsightBreakdown | null;
  outflowRatio: number | null;
  outflowTrendPp: number | null;
  outflowBreakdown: InsightBreakdown | null;
  onSelectUsage: () => void;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <InsightCard
        kicker="Wallets"
        icon={Wallet}
        loading={loading}
        onClick={onSelectUsage}
        value={<AnimatedNumber value={wallets} />}
        trend={walletsTrend}
        trendFormat={(v) => `${v.toFixed(1)}%`}
        detail={`Holding stablecoins · ${periodLabel}`}
        breakdown={walletBreakdown}
      />
      <InsightCard
        kicker="Corridors"
        icon={ArrowLeftRight}
        loading={corridorLoading}
        onClick={onSelectUsage}
        value={<AnimatedNumber value={corridorLoading ? null : corridorVolume} format={formatCurrency} />}
        trend={corridorTrend}
        trendFormat={(v) => `${v.toFixed(1)}%`}
        detail="International pairs only"
        breakdown={corridorBreakdown}
      />
      <InsightCard
        kicker="Vs outflows"
        icon={Percent}
        loading={loading || corridorLoading}
        onClick={onSelectUsage}
        value={
          <AnimatedNumber
            value={outflowRatio != null ? outflowRatio * 100 : null}
            format={(n) => `${n.toFixed(1)}%`}
          />
        }
        trend={outflowTrendPp}
        trendFormat={(v) => `${v.toFixed(1)}pp`}
        detail="Corridors vs remittances + services imports"
        breakdown={outflowBreakdown}
      />
      <InsightCard
        kicker="Dollarization"
        icon={DollarSign}
        loading={corridorLoading}
        onClick={onSelectUsage}
        value={
          <AnimatedNumber
            value={dollarization != null ? dollarization * 100 : null}
            format={(n) => `${n.toFixed(1)}%`}
          />
        }
        trend={dollarizationTrendPp}
        trendFormat={(v) => `${v.toFixed(2)}pp`}
        detail={`USD-referenced share of corridor volume · ${periodLabel}`}
        breakdown={dollarizationBreakdown}
      />
    </div>
  );
}

function InsightCard({
  kicker,
  icon: Icon,
  loading,
  onClick,
  value,
  trend,
  trendFormat,
  detail,
  breakdown,
}: {
  kicker: string;
  icon: typeof Wallet;
  loading: boolean;
  onClick: () => void;
  value: ReactNode;
  trend?: number | null;
  trendFormat?: (v: number) => string;
  detail: string;
  breakdown: InsightBreakdown | null;
}) {
  const fine = useFinePointer();
  const [open, setOpen] = useState(false);

  const card = (
    <button
      type="button"
      onClick={() => {
        if (!fine && breakdown) {
          setOpen(true);
          return;
        }
        onClick();
      }}
      className="surface p-5 text-left w-full transition-ui hover:border-[var(--brand)]/40"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="kicker inline-flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" aria-hidden />
          {kicker}
        </span>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <div className="display text-[1.85rem] sm:text-[2rem] tracking-tight text-[var(--ink-text)]">
          {loading ? <Skeleton className="h-8 w-28 inline-block" /> : value}
        </div>
        {!loading && trendFormat && <TrendBadge value={trend ?? null} format={trendFormat} showPeriod />}
      </div>
      <p className="text-xs text-[var(--muted-ink)] mt-2 leading-relaxed">{detail}</p>
    </button>
  );

  if (loading || !breakdown) return card;

  if (!fine) {
    return (
      <>
        {card}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-[var(--paper-raised)] text-[var(--ink-text)] border-[var(--hairline)]">
            <DialogHeader>
              <DialogTitle className="text-base">{kicker}</DialogTitle>
            </DialogHeader>
            <BreakdownPanel breakdown={breakdown} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <HoverCard openDelay={250} closeDelay={80}>
      <HoverCardTrigger asChild>{card}</HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="insight-hover w-[min(22rem,calc(100vw-2rem))] p-4 shadow-none bg-[var(--paper-raised)] text-[var(--ink-text)] border-[var(--hairline)]"
      >
        <BreakdownPanel breakdown={breakdown} />
      </HoverCardContent>
    </HoverCard>
  );
}

function BreakdownPanel({ breakdown }: { breakdown: InsightBreakdown }) {
  return (
    <div className="space-y-3">
      {breakdown.caption ? (
        <p className="text-[11px] leading-snug text-[var(--muted-ink)]">{breakdown.caption}</p>
      ) : null}
      {breakdown.bar && breakdown.bar.length > 0 ? <ShareBar segments={breakdown.bar} /> : null}
      <ul className="space-y-1.5">
        {breakdown.rows.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-[var(--ink-text)]">{row.label}</span>
            <span className="shrink-0 tabular-nums text-[var(--muted-ink)]">
              {row.value}
              {row.share != null ? ` · ${fmtPct(row.share)}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {breakdown.note ? (
        <p className="text-[11px] leading-snug text-[var(--muted-ink)]">{breakdown.note}</p>
      ) : null}
    </div>
  );
}

function ShareBar({ segments }: { segments: { key: string; share: number }[] }) {
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ink-text)_10%,transparent)]">
      {segments.map((segment, index) => (
        <div
          key={segment.key}
          className="h-full"
          style={{
            width: `${Math.max(0, segment.share) * 100}%`,
            backgroundColor:
              index === 0
                ? 'var(--brand)'
                : `color-mix(in oklab, var(--brand) ${Math.max(25, 85 - index * 18)}%, var(--muted-ink))`,
          }}
        />
      ))}
    </div>
  );
}

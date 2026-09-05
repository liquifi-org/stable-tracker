import type { ReactNode } from 'react';
import { Wallet, ArrowLeftRight, Percent, ShieldCheck } from 'lucide-react';
import { TrendBadge } from '../../app/components/TrendBadge';
import { AnimatedNumber } from '../../app/components/AnimatedNumber';
import { Skeleton } from '../../app/components/ui/skeleton';

export function InsightCards({
  periodLabel,
  loading,
  corridorLoading,
  wallets,
  walletsTrend,
  corridorVolume,
  corridorTrend,
  corridorDollarShare,
  remittanceRatio,
  remittanceTrendPp,
  liveFrameworks,
  rankedCountries,
  activeLens,
  onSelectUsage,
  onSelectRegulation,
  formatCurrency,
  formatPct,
}: {
  periodLabel: string;
  loading: boolean;
  corridorLoading: boolean;
  wallets: number | undefined;
  walletsTrend: number | null;
  corridorVolume: number;
  corridorTrend: number | null;
  corridorDollarShare: number | null;
  remittanceRatio: number | null;
  remittanceTrendPp: number | null;
  liveFrameworks: number | undefined;
  rankedCountries: number;
  activeLens: 'usage' | 'regulation';
  onSelectUsage: () => void;
  onSelectRegulation: () => void;
  formatCurrency: (n: number) => string;
  formatPct: (n: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <InsightCard
        kicker="Wallets"
        icon={Wallet}
        loading={loading}
        active={false}
        onClick={onSelectUsage}
        value={<AnimatedNumber value={wallets} />}
        trend={walletsTrend}
        trendFormat={(v) => `${v.toFixed(1)}%`}
        detail={`Holding stablecoins · ${periodLabel}`}
      />
      <InsightCard
        kicker="Corridors"
        icon={ArrowLeftRight}
        loading={corridorLoading}
        active={false}
        onClick={onSelectUsage}
        value={<AnimatedNumber value={corridorLoading ? null : corridorVolume} format={formatCurrency} />}
        trend={corridorTrend}
        trendFormat={(v) => `${v.toFixed(1)}%`}
        detail={
          corridorDollarShare != null
            ? `International pairs · ${formatPct(corridorDollarShare)} USD-referenced`
            : 'International pairs only · domestic not in this data'
        }
      />
      <InsightCard
        kicker="Vs remittances"
        icon={Percent}
        sourceNote="World Bank"
        loading={loading || corridorLoading}
        active={false}
        onClick={onSelectUsage}
        value={
          <AnimatedNumber
            value={remittanceRatio != null ? remittanceRatio * 100 : null}
            format={(n) => `${n.toFixed(1)}%`}
          />
        }
        trend={remittanceTrendPp}
        trendFormat={(v) => `${v.toFixed(1)}pp`}
        detail={`Corridor volume vs official remittances (annual / 12) · ${periodLabel}`}
      />
      <InsightCard
        kicker="Live rules"
        icon={ShieldCheck}
        loading={loading}
        active={activeLens === 'regulation'}
        onClick={onSelectRegulation}
        value={<AnimatedNumber value={liveFrameworks} />}
        detail={
          rankedCountries > 0
            ? `Countries with a live framework · ${rankedCountries} ranked for adoption`
            : 'Stage 3 · not month-dependent'
        }
      />
    </div>
  );
}

function InsightCard({
  kicker,
  icon: Icon,
  sourceNote,
  loading,
  active,
  onClick,
  value,
  trend,
  trendFormat,
  detail,
}: {
  kicker: string;
  icon: typeof Wallet;
  sourceNote?: string;
  loading: boolean;
  active: boolean;
  onClick: () => void;
  value: ReactNode;
  trend?: number | null;
  trendFormat?: (v: number) => string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`surface p-5 text-left w-full transition-ui hover:border-[var(--brand)]/40 ${
        active ? 'ring-1 ring-[var(--brand)]/35' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="kicker inline-flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" aria-hidden />
          {kicker}
        </span>
        {sourceNote ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-ink)]">
            {sourceNote}
          </span>
        ) : null}
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
}

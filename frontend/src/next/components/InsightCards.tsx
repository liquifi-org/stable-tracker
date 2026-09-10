import type { ReactNode } from 'react';
import { Wallet, ArrowLeftRight, Percent, DollarSign } from 'lucide-react';
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
  dollarization,
  dollarizationTrendPp,
  remittanceRatio,
  remittanceTrendPp,
  onSelectUsage,
  formatCurrency,
}: {
  periodLabel: string;
  loading: boolean;
  corridorLoading: boolean;
  wallets: number | undefined;
  walletsTrend: number | null;
  corridorVolume: number;
  corridorTrend: number | null;
  dollarization: number | null;
  dollarizationTrendPp: number | null;
  remittanceRatio: number | null;
  remittanceTrendPp: number | null;
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
      />
      <InsightCard
        kicker="Corridors"
        icon={ArrowLeftRight}
        loading={corridorLoading}
        onClick={onSelectUsage}
        value={<AnimatedNumber value={corridorLoading ? null : corridorVolume} format={formatCurrency} />}
        trend={corridorTrend}
        trendFormat={(v) => `${v.toFixed(1)}%`}
        detail={`International pairs only · domestic not in this data`}
      />
      <InsightCard
        kicker="Vs remittances"
        icon={Percent}
        sourceNote="World Bank"
        loading={loading || corridorLoading}
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
        kicker="Dollarization"
        icon={DollarSign}
        sourceNote="Allium"
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
      />
    </div>
  );
}

function InsightCard({
  kicker,
  icon: Icon,
  sourceNote,
  loading,
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
      className="surface p-5 text-left w-full transition-ui hover:border-[var(--brand)]/40"
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

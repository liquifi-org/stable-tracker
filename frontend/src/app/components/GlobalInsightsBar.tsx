import { Wallet, ShieldCheck, ArrowLeftRight, Percent } from 'lucide-react';
import { TrendBadge } from './TrendBadge';
import { SourceBadge, type DataSource } from './SourceBadge';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';
import { MONTHS } from '../context/FilterContext';
import type { GlobalInsights } from '../services/api';

function pctChange(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

interface GlobalInsightsBarProps {
  data: GlobalInsights | null;
  previousData: GlobalInsights | null;
  loading: boolean;
  /** Reporting period the flow-based stats (transaction volume, remittances comparison) cover. */
  year: number;
  month: number;
}

export function GlobalInsightsBar({ data, previousData, loading, year, month }: GlobalInsightsBarProps) {
  const { formatCurrency } = useCurrencyFormat();
  const periodLabel = `${MONTHS[month - 1]} ${year}`;
  const stablecoinVsRemittancesPct =
    data && data.totalRemittancesUsd > 0
      ? (data.totalTxValueUsd / data.totalRemittancesUsd) * 100
      : null;
  const previousStablecoinVsRemittancesPct =
    previousData && previousData.totalRemittancesUsd > 0
      ? (previousData.totalTxValueUsd / previousData.totalRemittancesUsd) * 100
      : null;

  const stats: { label: string; value: string; Icon: typeof Wallet; trend: number | null; trendFormat: (v: number) => string; source?: DataSource; hideOnLaptop?: boolean; showPeriod?: boolean }[] = [
    {
      label: 'Wallets holding stablecoins',
      value: data ? data.totalActiveWallets.toLocaleString() : '—',
      Icon: Wallet,
      trend: data && previousData ? pctChange(data.totalActiveWallets, previousData.totalActiveWallets) : null,
      trendFormat: (v) => `${v.toFixed(2)}%`,
      source: 'allium',
      showPeriod: true,
    },
    {
      label: 'Countries with live regulation',
      value: data ? data.liveRegulationCountries.toLocaleString() : '—',
      Icon: ShieldCheck,
      trend: null,
      trendFormat: (v) => `${v.toFixed(2)}%`,
      source: 'stride',
      // Least critical of the 4 at a glance — drop it at the cramped "smaller laptop" width
      // band (lg, ~1024-1279px) where 4 cards don't fit comfortably; the grid goes 3-wide
      // there. Comes back once xl (1280px+) has room for all 4.
      hideOnLaptop: true,
    },
    {
      label: 'Stablecoin transaction volume',
      value: data ? formatCurrency(data.totalTxValueUsd) : '—',
      Icon: ArrowLeftRight,
      trend: data && previousData ? pctChange(data.totalTxValueUsd, previousData.totalTxValueUsd) : null,
      trendFormat: (v) => `${v.toFixed(2)}%`,
      source: 'allium',
      showPeriod: true,
    },
    {
      label: 'Stablecoin volume vs. remittances',
      value: stablecoinVsRemittancesPct != null ? `${stablecoinVsRemittancesPct.toFixed(2)}%` : '—',
      Icon: Percent,
      trend:
        stablecoinVsRemittancesPct != null && previousStablecoinVsRemittancesPct != null
          ? stablecoinVsRemittancesPct - previousStablecoinVsRemittancesPct
          : null,
      trendFormat: (v) => `${v.toFixed(2)}pp`,
      showPeriod: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {stats.map(({ label, value, Icon, trend, trendFormat, source, hideOnLaptop, showPeriod }) => (
        <div
          key={label}
          className={`bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-xl p-4 shadow-md flex items-center gap-3 transition-all duration-300 ${
            hideOnLaptop ? 'lg:hidden xl:flex' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/40 text-[var(--brand)] dark:text-[var(--brand-300)]">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`flex items-center gap-2 flex-wrap text-xl font-bold text-slate-800 dark:text-slate-100 transition-opacity ${loading ? 'opacity-40' : ''}`}>
              {value}
              <TrendBadge value={trend} format={trendFormat} showPeriod />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {label}
              {showPeriod && <span className="text-slate-400 dark:text-slate-500"> · {periodLabel}</span>}
            </div>
            {/* Kept in normal flow below the label (not flex-centered against the icon) so it
                never overlaps text when the label wraps to 2-3 lines on narrow cards. */}
            {source && <SourceBadge source={source} label={label} size="sm" className="mt-1" />}
          </div>
        </div>
      ))}
    </div>
  );
}

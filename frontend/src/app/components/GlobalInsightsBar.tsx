import { Wallet, ShieldCheck, ArrowLeftRight, Percent } from 'lucide-react';
import { TrendBadge } from './TrendBadge';
import { SourceBadge, type DataSource } from './SourceBadge';
import type { GlobalInsights } from '../services/api';

function formatCompactUsd(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

function pctChange(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

interface GlobalInsightsBarProps {
  data: GlobalInsights | null;
  previousData: GlobalInsights | null;
  loading: boolean;
}

export function GlobalInsightsBar({ data, previousData, loading }: GlobalInsightsBarProps) {
  const stablecoinVsRemittancesPct =
    data && data.totalRemittancesUsd > 0
      ? (data.totalTxValueUsd / data.totalRemittancesUsd) * 100
      : null;
  const previousStablecoinVsRemittancesPct =
    previousData && previousData.totalRemittancesUsd > 0
      ? (previousData.totalTxValueUsd / previousData.totalRemittancesUsd) * 100
      : null;

  const stats: { label: string; value: string; Icon: typeof Wallet; trend: number | null; trendFormat: (v: number) => string; source?: DataSource }[] = [
    {
      label: 'Wallets holding stablecoins',
      value: data ? data.totalActiveWallets.toLocaleString() : '—',
      Icon: Wallet,
      trend: data && previousData ? pctChange(data.totalActiveWallets, previousData.totalActiveWallets) : null,
      trendFormat: (v) => `${v.toFixed(2)}%`,
      source: 'allium',
    },
    {
      label: 'Countries with live regulation',
      value: data ? data.liveRegulationCountries.toLocaleString() : '—',
      Icon: ShieldCheck,
      trend: null,
      trendFormat: (v) => `${v.toFixed(2)}%`,
      source: 'stride',
    },
    {
      label: 'Stablecoin transaction volume',
      value: data ? formatCompactUsd(data.totalTxValueUsd) : '—',
      Icon: ArrowLeftRight,
      trend: data && previousData ? pctChange(data.totalTxValueUsd, previousData.totalTxValueUsd) : null,
      trendFormat: (v) => `${v.toFixed(2)}%`,
      source: 'allium',
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
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, Icon, trend, trendFormat, source }) => (
        <div
          key={label}
          className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-xl p-4 shadow-md flex items-center gap-3 transition-all duration-300"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/40 text-[var(--brand)] dark:text-[var(--brand-300)]">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100 transition-opacity ${loading ? 'opacity-40' : ''}`}>
              {value}
              <TrendBadge value={trend} format={trendFormat} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
          </div>
          {source && <SourceBadge source={source} label={label} size="md" className="ml-auto" />}
        </div>
      ))}
    </div>
  );
}

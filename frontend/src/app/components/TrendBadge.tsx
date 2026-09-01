import { ArrowUp, ArrowDown } from 'lucide-react';

interface TrendBadgeProps {
  /** Positive = improvement/increase (rendered green, arrow up). Negative = decline (red, arrow down). */
  value: number | null;
  format: (absValue: number) => string;
  /** When true, appends a small "vs prev. mo." label so users know the comparison period. */
  showPeriod?: boolean;
}

export function TrendBadge({ value, format, showPeriod }: TrendBadgeProps) {
  if (value === null || Number.isNaN(value) || value === 0) return null;

  const isUp = value > 0;
  const Icon = isUp ? ArrowUp : ArrowDown;

  return (
    <span
      title="vs. previous month"
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-500'
      }`}
    >
      <Icon className="w-3 h-3" />
      {format(Math.abs(value))}
      {showPeriod && (
        <span className="ml-0.5 font-normal text-[10px] text-slate-400 dark:text-slate-500">vs prev. mo.</span>
      )}
    </span>
  );
}

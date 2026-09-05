import { useNavigate } from 'react-router';
import { CountryFlag } from '../../app/components/CountryFlag';
import { fmtPer100k } from '../lib/format';
import { stageLabel } from '../lib/marketType';
import { countryPath } from '../../app/lib/countryRoutes';

export interface UsageRuleRow {
  countryId: string;
  name: string;
  isoAlpha2: string;
  adoptionRate: number;
  activeWallets: number;
  stage?: number;
}

const ELIGIBLE = 10_000;

export function UsageRegulationMatrix({ rows }: { rows: UsageRuleRow[] }) {
  const navigate = useNavigate();
  const eligible = rows.filter((r) => r.activeWallets > ELIGIBLE);
  if (eligible.length === 0) {
    return <p className="text-sm text-slate-500">Not enough ranked countries to draw this split.</p>;
  }

  const rates = [...eligible].map((r) => r.adoptionRate).sort((a, b) => a - b);
  const median = rates[Math.floor(rates.length / 2)] ?? 0;

  const buckets = {
    hotUnruled: eligible.filter((r) => r.adoptionRate >= median && (r.stage == null || r.stage < 3)),
    hotLive: eligible.filter((r) => r.adoptionRate >= median && r.stage === 3),
    quietLive: eligible.filter((r) => r.adoptionRate < median && r.stage === 3),
    quietUnruled: eligible.filter((r) => r.adoptionRate < median && (r.stage == null || r.stage < 3)),
  };

  const Cell = ({
    title,
    subtitle,
    items,
  }: {
    title: string;
    subtitle: string;
    items: UsageRuleRow[];
  }) => (
    <div className="border border-[var(--hairline)] rounded-xl p-3 bg-[var(--paper)] min-h-[140px]">
      <div className="text-sm font-semibold text-[var(--ink-text)]">{title}</div>
      <div className="text-[11px] text-[var(--muted-ink)] mb-2">{subtitle} · {items.length}</div>
      <div className="flex flex-wrap gap-1.5">
        {items
          .sort((a, b) => b.adoptionRate - a.adoptionRate)
          .slice(0, 8)
          .map((c) => (
            <button
              key={c.countryId}
              type="button"
              onClick={() =>
                navigate(countryPath({ countryId: c.countryId, name: c.name, isoAlpha2: c.isoAlpha2 }), {
                  state: { name: c.name, isoAlpha2: c.isoAlpha2 },
                })
              }
              className="inline-flex items-center gap-1 rounded-full border border-[var(--hairline)] px-2 py-0.5 text-[11px] hover:border-[var(--brand)] transition-ui"
              title={`${c.name} · ${fmtPer100k(c.adoptionRate)} / 100k · ${stageLabel(c.stage)}`}
            >
              <CountryFlag isoAlpha2={c.isoAlpha2} className="w-3 h-3" />
              {c.isoAlpha2 || c.name}
            </button>
          ))}
        {items.length > 8 && (
          <span className="text-[11px] text-slate-400 self-center">+{items.length - 8}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        High usage = at or above median wallets-per-capita among countries with &gt;10k wallets.
        Live rules = stage 3 (not month-dependent).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Cell
          title="High usage, no live rules"
          subtitle="Policy gap"
          items={buckets.hotUnruled}
        />
        <Cell
          title="High usage, live rules"
          subtitle="Active regulated markets"
          items={buckets.hotLive}
        />
        <Cell
          title="Quiet, live rules"
          subtitle="Framework ahead of usage"
          items={buckets.quietLive}
        />
        <Cell
          title="Quiet, no live rules"
          subtitle="Neither axis"
          items={buckets.quietUnruled}
        />
      </div>
    </div>
  );
}

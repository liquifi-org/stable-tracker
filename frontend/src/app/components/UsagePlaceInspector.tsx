import type { Dispatch, SetStateAction } from 'react';
import type { CountryAdoptionMetric, RegionalAdoptionMetric } from '../services/api';
import { CountryFlag } from './CountryFlag';
import { focusCountryOnMap } from '../lib/mapEvents';

function fmtWallets(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtPct(ratio: number): string {
  const pct = ratio * 100;
  if (pct < 0.01) return pct.toFixed(4) + '%';
  if (pct < 1) return pct.toFixed(2) + '%';
  return pct.toFixed(1) + '%';
}

function coinSummary(coins?: { name: string; share: number }[]): string {
  if (!coins?.length) return '—';
  return coins.slice(0, 3).map((s) => `${s.name} ${Math.round(s.share * 100)}%`).join(' · ');
}

export interface UsageCorridorRow {
  partner: string;
  outbound: number;
  inbound: number;
  totalValue: number;
  dollarizationIndex: number;
  outboundCoins?: { name: string; share: number }[];
  inboundCoins?: { name: string; share: number }[];
}

export function UsagePlaceInspector({
  mode,
  activePlace,
  hoveredMetric,
  hoveredRegion,
  corridorCaption,
  corridorTotals,
  hoveredSpokeCount,
  activeCorridors,
  showCorridorDetails,
  setShowCorridorDetails,
  formatValue,
  getLabel,
  goToCountry,
  closePlace,
}: {
  mode: 'country' | 'region';
  activePlace: string;
  hoveredMetric?: CountryAdoptionMetric;
  hoveredRegion?: RegionalAdoptionMetric;
  corridorCaption: string;
  corridorTotals: { outbound: number; inbound: number; total: number; usdShare: number | null };
  hoveredSpokeCount: number;
  activeCorridors: UsageCorridorRow[];
  showCorridorDetails: boolean;
  setShowCorridorDetails: Dispatch<SetStateAction<boolean>>;
  formatValue: (n: number) => string;
  getLabel: (id: string) => string;
  goToCountry: (ref: { name?: string; isoAlpha2?: string; countryId?: string }) => void;
  closePlace: () => void;
}) {
  return (
    <>
      <div className="bg-[var(--brand)]/10 dark:bg-[var(--brand)]/15 px-4 py-2 border-b border-slate-200 dark:border-neutral-700">
        <h3 className="font-bold text-[var(--brand-700)] dark:text-[var(--brand-300)] text-lg flex items-center gap-2">
          {mode === 'country' && (
            <CountryFlag isoAlpha2={hoveredMetric?.isoAlpha2 ?? activePlace} className="w-5 h-5" />
          )}
          {mode === 'country' ? (hoveredMetric?.name ?? getLabel(activePlace)) : activePlace}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {[
            mode === 'country' ? hoveredMetric?.region : `${hoveredRegion?.countryCount ?? '—'} countries`,
            corridorCaption,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-neutral-700">
        <div className="px-4 py-3 space-y-4">
          <div>
            <div className="text-xs font-semibold text-[var(--brand-700)] dark:text-[var(--brand-300)] italic mb-2">Economic integration</div>
            <div className="space-y-2 text-xs">
              {mode === 'country' && hoveredMetric ? (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Stablecoin TX value share</span>
                  <span className="text-slate-800 dark:text-slate-100 font-bold text-base tabular-nums">{fmtPct(hoveredMetric.txValueShare)}</span>
                </div>
              ) : hoveredRegion ? (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Stablecoin TX value share</span>
                  <span className="text-slate-800 dark:text-slate-100 font-bold text-base tabular-nums">{fmtPct(hoveredRegion.txValueShare)}</span>
                </div>
              ) : null}
              {hoveredSpokeCount > 0 && (
                <>
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Outbound corridor volume</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{formatValue(corridorTotals.outbound)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Inbound corridor volume</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{formatValue(corridorTotals.inbound)}</span>
                  </div>
                  {corridorTotals.usdShare != null && (
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400">USD-referenced share</span>
                      <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{fmtPct(corridorTotals.usdShare)}</span>
                    </div>
                  )}
                </>
              )}
              {mode === 'country' && hoveredMetric?.relativeAdoptionIndex != null && (
                <>
                  <div className="flex justify-between items-center gap-3 pt-1">
                    <span className="text-slate-500 dark:text-slate-400">GDP intensity (rank)</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">
                      #{hoveredMetric.adoptionRank}
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-normal"> of {hoveredMetric.eligibleCountries}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Outbound vs GDP</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{fmtPct(hoveredMetric.gdpIntensity)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Wallets holding stablecoins</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{fmtWallets(hoveredMetric.activeWallets)}</span>
                  </div>
                </>
              )}
              {mode === 'region' && hoveredRegion && (
                <>
                  <div className="flex justify-between items-center gap-3 pt-1">
                    <span className="text-slate-500 dark:text-slate-400">Outbound vs GDP</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{fmtPct(hoveredRegion.adoptionRate)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Wallets holding stablecoins</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{fmtWallets(hoveredRegion.activeWallets)}</span>
                  </div>
                </>
              )}
              {mode === 'country' && hoveredMetric && hoveredMetric.relativeAdoptionIndex == null && (
                <p className="text-slate-500 dark:text-slate-400 italic">
                  Not ranked — no outbound corridors in this period, or no GDP
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="text-xs font-semibold text-[var(--brand-700)] dark:text-[var(--brand-300)] italic mb-2">Corridors</div>
          {activeCorridors.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">No international corridors</p>
          ) : (
            <div className="max-h-56 overflow-y-auto pr-1">
              {activeCorridors.map((row) => (
                <button
                  key={row.partner}
                  type="button"
                  onClick={() => {
                    if (mode === 'country') {
                      focusCountryOnMap({
                        countryId: row.partner,
                        name: getLabel(row.partner),
                        isoAlpha2: row.partner,
                      });
                    }
                  }}
                  className="flex w-full items-start justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-neutral-700/80 last:border-b-0 text-left"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {mode === 'country' && <CountryFlag isoAlpha2={row.partner} className="w-4 h-3 rounded-sm shrink-0" />}
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{getLabel(row.partner)}</span>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{formatValue(row.totalValue)}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      → {formatValue(row.outbound)} · ← {formatValue(row.inbound)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCorridorDetails && activeCorridors.length > 0 && (
        <div className="border-t border-slate-200 dark:border-neutral-700 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-700 bg-slate-50/80 dark:bg-neutral-900/60 text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 text-left font-medium">Partner</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Outbound</th>
                <th className="px-3 py-2 text-right font-medium">Inbound</th>
                <th className="px-3 py-2 text-right font-medium">USD share</th>
                <th className="px-3 py-2 text-left font-medium">Outbound coins</th>
              </tr>
            </thead>
            <tbody>
              {activeCorridors.map((row) => (
                <tr key={`detail-${row.partner}`} className="border-b border-slate-100 dark:border-neutral-700/80 last:border-b-0">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-medium">
                      {mode === 'country' && <CountryFlag isoAlpha2={row.partner} className="w-4 h-3 rounded-sm" />}
                      {getLabel(row.partner)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-100">{formatValue(row.totalValue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatValue(row.outbound)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatValue(row.inbound)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{fmtPct(row.dollarizationIndex)}</td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{coinSummary(row.outboundCoins)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-2 border-t border-slate-200 dark:border-neutral-700 flex items-center gap-2 flex-wrap justify-end">
        {mode === 'country' && (
          <button
            type="button"
            onClick={() => {
              goToCountry({
                countryId: hoveredMetric?.countryId ?? activePlace,
                name: hoveredMetric?.name ?? getLabel(activePlace),
                isoAlpha2: hoveredMetric?.isoAlpha2 ?? activePlace,
              });
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-[var(--brand)] hover:bg-[var(--brand-700)] transition-colors"
          >
            Details
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowCorridorDetails((v) => !v)}
          disabled={activeCorridors.length === 0}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            showCorridorDetails
              ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand)]/10'
              : 'border-slate-300 dark:border-neutral-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700'
          }`}
        >
          Corridor details
        </button>
        <button
          type="button"
          onClick={closePlace}
          className="px-3 py-1.5 text-xs font-semibold rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors"
        >
          Close
        </button>
      </div>
    </>
  );
}

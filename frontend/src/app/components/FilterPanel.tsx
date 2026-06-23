import { useState, useEffect } from 'react';
import { useFilters, MAX_YEAR, maxMonthForYear } from '../context/FilterContext';
import { api } from '../services/api';
import { Slider } from '@radix-ui/react-slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function FilterPanel() {
  const {
    year,
    month,
    referenceAsset,
    stablecoin,
    country,
    regionFrom,
    regionTo,
    mapType,
    setYear,
    setMonth,
    setReferenceAsset,
    setStablecoin,
    setCountry,
    setRegionFrom,
    setRegionTo,
  } = useFilters();

  const showCorridorFilters = mapType === 'corridors';

  // Local, uncommitted slider positions: update live for visual feedback while dragging,
  // but only call setYear/setMonth (which trigger data refetches) once the user lets go.
  const [draftYear, setDraftYear] = useState(year);
  const [draftMonth, setDraftMonth] = useState(month);
  useEffect(() => setDraftYear(year), [year]);
  useEffect(() => setDraftMonth(month), [month]);

  const draftMaxMonth = maxMonthForYear(draftYear);
  const draftMonthClamped = Math.min(draftMonth, draftMaxMonth);

  // Stablecoin options come from whatever's actually present in the corridor data for this
  // period, rather than a hardcoded guess list — keeps the dropdown honest and filterable.
  const [stablecoinOptions, setStablecoinOptions] = useState<string[]>([]);
  useEffect(() => {
    if (!showCorridorFilters) return;
    api.getCorridorStablecoins(year, month)
      .then(setStablecoinOptions)
      .catch(() => setStablecoinOptions([]));
  }, [showCorridorFilters, year, month]);

  // Defaults: most recent selectable period (previous calendar month), no asset/coin/country/region filter.
  const hasNonDefaultFilters =
    year !== MAX_YEAR ||
    month !== maxMonthForYear(MAX_YEAR) ||
    referenceAsset !== 'All' ||
    stablecoin !== 'All' ||
    country !== 'All' ||
    regionFrom !== 'All' ||
    regionTo !== 'All';

  const handleResetFilters = () => {
    setYear(MAX_YEAR);
    setMonth(maxMonthForYear(MAX_YEAR));
    setReferenceAsset('All');
    setStablecoin('All');
    setCountry('All');
    setRegionFrom('All');
    setRegionTo('All');
  };

  return (
    <aside className="w-80 border-l border-slate-200/50 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 space-y-6 shadow-md transition-all duration-300">
      <div>
        <h2 className="font-semibold text-lg mb-4 text-slate-800 dark:text-slate-100">Filters</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-3 font-medium">Historic State</label>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                  <span>Year</span>
                  <span className="font-semibold">{draftYear}</span>
                </div>
                <Slider
                  value={[draftYear]}
                  onValueChange={([val]) => setDraftYear(val)}
                  onValueCommit={([val]) => setYear(val)}
                  min={2025}
                  max={MAX_YEAR}
                  step={1}
                  className="relative flex items-center w-full h-5"
                >
                  <div className="relative h-1 w-full bg-slate-300 dark:bg-neutral-700 rounded">
                    <div className="absolute h-1 rounded" style={{ width: `${((draftYear - 2025) / (MAX_YEAR - 2025)) * 100}%`, backgroundColor: 'var(--brand)' }} />
                  </div>
                  <div className="absolute h-4 w-4 rounded-full shadow-md cursor-pointer border border-white" style={{ left: `${((draftYear - 2025) / (MAX_YEAR - 2025)) * 100}%`, transform: 'translateX(-50%)', backgroundColor: 'var(--brand)' }} />
                </Slider>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                  <span>Month</span>
                  <span className="font-semibold">{MONTHS[draftMonthClamped - 1]}</span>
                </div>
                <Slider
                  value={[draftMonthClamped]}
                  onValueChange={([val]) => setDraftMonth(val)}
                  onValueCommit={([val]) => setMonth(val)}
                  min={1}
                  max={draftMaxMonth}
                  step={1}
                  className="relative flex items-center w-full h-5"
                >
                  <div className="relative h-1 w-full bg-slate-300 dark:bg-neutral-700 rounded">
                    <div className="absolute h-1 rounded" style={{ width: `${((draftMonthClamped - 1) / Math.max(1, draftMaxMonth - 1)) * 100}%`, backgroundColor: 'var(--brand)' }} />
                  </div>
                  <div className="absolute h-4 w-4 rounded-full shadow-md cursor-pointer border border-white" style={{ left: `${((draftMonthClamped - 1) / Math.max(1, draftMaxMonth - 1)) * 100}%`, transform: 'translateX(-50%)', backgroundColor: 'var(--brand)' }} />
                </Slider>
              </div>
            </div>
          </div>

          {showCorridorFilters && (
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Reference Asset</label>
              <select
                value={referenceAsset}
                onChange={(e) => setReferenceAsset(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300"
              >
                <option value="All">All</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          )}

          {showCorridorFilters && (
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Stablecoin</label>
              <select
                value={stablecoin}
                onChange={(e) => setStablecoin(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300"
              >
                <option value="All">All</option>
                {stablecoinOptions.map((symbol) => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>
          )}

          {showCorridorFilters && (
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300"
              >
                <option value="All">All</option>
                <option value="US">United States</option>
                <option value="BR">Brazil</option>
                <option value="AR">Argentina</option>
                <option value="MX">Mexico</option>
                <option value="NG">Nigeria</option>
                <option value="KE">Kenya</option>
                <option value="IN">India</option>
                <option value="CN">China</option>
                <option value="TR">Turkey</option>
                <option value="VE">Venezuela</option>
              </select>
            </div>
          )}

          {showCorridorFilters && (
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Region From</label>
              <select
                value={regionFrom}
                onChange={(e) => setRegionFrom(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300"
              >
                <option value="All">All</option>
                <option value="North America">North America</option>
                <option value="South America">South America</option>
                <option value="Europe">Europe</option>
                <option value="Asia">Asia</option>
                <option value="Africa">Africa</option>
              </select>
            </div>
          )}

          {showCorridorFilters && (
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Region To</label>
              <select
                value={regionTo}
                onChange={(e) => setRegionTo(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300"
              >
                <option value="All">All</option>
                <option value="North America">North America</option>
                <option value="South America">South America</option>
                <option value="Europe">Europe</option>
                <option value="Asia">Asia</option>
                <option value="Africa">Africa</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200/50 dark:border-neutral-700">
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <div className="mb-2 font-semibold text-slate-800 dark:text-slate-100">Active filters:</div>
          <div className="space-y-1">
            <div>Period: <span className="text-slate-800 dark:text-slate-200 font-medium">{MONTHS[month - 1]} {year}</span></div>
            {showCorridorFilters && <div>Asset: <span className="text-slate-800 dark:text-slate-200 font-medium">{referenceAsset}</span></div>}
            {showCorridorFilters && stablecoin !== 'All' && <div>Coin: <span className="text-slate-800 dark:text-slate-200 font-medium">{stablecoin}</span></div>}
            {showCorridorFilters && country !== 'All' && <div>Country: <span className="text-slate-800 dark:text-slate-200 font-medium">{country}</span></div>}
            {showCorridorFilters && regionFrom !== 'All' && <div>Region From: <span className="text-slate-800 dark:text-slate-200 font-medium">{regionFrom}</span></div>}
            {showCorridorFilters && regionTo !== 'All' && <div>Region To: <span className="text-slate-800 dark:text-slate-200 font-medium">{regionTo}</span></div>}
          </div>
        </div>

        {hasNonDefaultFilters && (
          <button
            onClick={handleResetFilters}
            className="mt-3 w-full text-xs border border-slate-200/50 dark:border-neutral-700 hover:border-[var(--brand)] hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg transition-all duration-300 font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>
    </aside>
  );
}

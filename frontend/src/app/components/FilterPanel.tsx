import { useState, useEffect } from 'react';
import { useFilters, MAX_YEAR, maxMonthForYear, MONTHS } from '../context/FilterContext';
import { api } from '../services/api';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Filter, X } from 'lucide-react';

export function FilterPanel() {
  const {
    year,
    month,
    referenceAsset,
    stablecoin,
    regionFrom,
    regionTo,
    mapType,
    displayCurrency,
    setYear,
    setMonth,
    setReferenceAsset,
    setStablecoin,
    setRegionFrom,
    setRegionTo,
    setDisplayCurrency,
  } = useFilters();

  const showCorridorFilters = mapType === 'corridors';

  // Below lg, the sidebar is replaced by a FAB + bottom sheet (no room for a static panel
  // without pushing all page content down).
  const [mobileOpen, setMobileOpen] = useState(false);

  // Stablecoin options come from whatever's actually present in the corridor data for this
  // period, rather than a hardcoded guess list — keeps the dropdown honest and filterable.
  const [stablecoinOptions, setStablecoinOptions] = useState<string[]>([]);
  useEffect(() => {
    if (!showCorridorFilters) return;
    api.getCorridorStablecoins(year, month)
      .then(setStablecoinOptions)
      .catch(() => setStablecoinOptions([]));
  }, [showCorridorFilters, year, month]);

  // Defaults: most recent selectable period (previous calendar month), no asset/coin/region filter.
  const hasNonDefaultFilters =
    year !== MAX_YEAR ||
    month !== maxMonthForYear(MAX_YEAR) ||
    referenceAsset !== 'All' ||
    stablecoin !== 'All' ||
    regionFrom !== 'All' ||
    regionTo !== 'All' ||
    displayCurrency !== 'USD';

  const handleResetFilters = () => {
    setYear(MAX_YEAR);
    setMonth(maxMonthForYear(MAX_YEAR));
    setReferenceAsset('All');
    setStablecoin('All');
    setRegionFrom('All');
    setRegionTo('All');
    setDisplayCurrency('USD');
  };

  const filterControls = (
    <>
      <div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-3 font-medium">Historic State</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300"
                >
                  {Array.from({ length: MAX_YEAR - 2025 + 1 }, (_, i) => 2025 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full bg-white dark:bg-neutral-900 border border-slate-200/50 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none transition-all duration-300"
                >
                  {MONTHS.slice(0, maxMonthForYear(year)).map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Display Currency</label>
            <div className="flex gap-1 bg-slate-100 dark:bg-neutral-900 rounded-lg p-1">
              {(['USD', 'EUR'] as const).map((currency) => (
                <button
                  key={currency}
                  onClick={() => setDisplayCurrency(currency)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    displayCurrency === currency
                      ? 'text-white shadow'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  style={displayCurrency === currency ? { backgroundColor: 'var(--brand)' } : {}}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>

          {showCorridorFilters && (
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Currency</label>
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
            <div>Display Currency: <span className="text-slate-800 dark:text-slate-200 font-medium">{displayCurrency}</span></div>
            {showCorridorFilters && <div>Currency: <span className="text-slate-800 dark:text-slate-200 font-medium">{referenceAsset}</span></div>}
            {showCorridorFilters && stablecoin !== 'All' && <div>Coin: <span className="text-slate-800 dark:text-slate-200 font-medium">{stablecoin}</span></div>}
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
    </>
  );

  return (
    <>
      {/* lg+: static sidebar, same as before */}
      <aside className="hidden lg:block lg:w-80 lg:shrink-0 border-l border-slate-200/50 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 space-y-6 shadow-md transition-all duration-300">
        <h2 className="font-semibold text-lg mb-4 text-slate-800 dark:text-slate-100">Filters</h2>
        {filterControls}
      </aside>

      {/* Below lg: floating button opens the same controls in a bottom sheet, instead of
          pushing all page content down to make room for a static panel. Docked bottom-LEFT —
          the right corner is already claimed by page content at various scroll positions
          (the Country/Region view toggle, map zoom controls, table pagination). */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open filters"
        className="lg:hidden fixed bottom-5 left-5 z-40 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform duration-300 hover:scale-105"
        style={{ backgroundColor: 'var(--brand)' }}
      >
        <Filter className="w-6 h-6" />
        {hasNonDefaultFilters && (
          <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-neutral-900" />
        )}
      </button>

      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="lg:hidden fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-neutral-800 p-6 shadow-lg space-y-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300"
          >
            <div className="mx-auto -mt-2 mb-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-neutral-600" />
            <div className="flex items-center justify-between">
              <DialogPrimitive.Title className="font-semibold text-lg text-slate-800 dark:text-slate-100">Filters</DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close filters"
                className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-700"
              >
                <X className="w-5 h-5" />
              </DialogPrimitive.Close>
            </div>
            {filterControls}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

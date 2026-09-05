import { useState, useEffect } from 'react';
import { useFilters, MAX_YEAR, maxMonthForYear, MONTHS } from '../../app/context/FilterContext';
import { api } from '../../app/services/api';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Filter, X } from 'lucide-react';
import { FilterSelect } from '../../app/components/FilterSelect';

/** Matches backend WorldRegion values. */
const REGIONS = [
  'North America',
  'Latin America',
  'Central America',
  'Caribbean',
  'Europe',
  'MENA',
  'Sub-Saharan Africa',
  'South Asia',
  'East Asia',
  'Southeast Asia',
  'Central Asia',
  'Oceania',
];

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

  const showCorridorFilters = mapType !== 'regulation';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stablecoinOptions, setStablecoinOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!showCorridorFilters) return;
    api.getCorridorStablecoins(year, month)
      .then((opts) => {
        setStablecoinOptions(opts);
        if (stablecoin !== 'All' && !opts.includes(stablecoin)) setStablecoin('All');
      })
      .catch(() => setStablecoinOptions([]));
  }, [showCorridorFilters, year, month]);

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

  const chips: { key: string; label: string; onClear: () => void }[] = [];
  if (year !== MAX_YEAR || month !== maxMonthForYear(MAX_YEAR)) {
    chips.push({
      key: 'period',
      label: `${MONTHS[month - 1]} ${year}`,
      onClear: () => {
        setYear(MAX_YEAR);
        setMonth(maxMonthForYear(MAX_YEAR));
      },
    });
  }
  if (displayCurrency !== 'USD') {
    chips.push({ key: 'fx', label: displayCurrency, onClear: () => setDisplayCurrency('USD') });
  }
  if (showCorridorFilters && referenceAsset !== 'All') {
    chips.push({ key: 'asset', label: referenceAsset, onClear: () => setReferenceAsset('All') });
  }
  if (showCorridorFilters && stablecoin !== 'All') {
    chips.push({ key: 'coin', label: stablecoin, onClear: () => setStablecoin('All') });
  }
  if (showCorridorFilters && regionFrom !== 'All') {
    chips.push({ key: 'from', label: `From ${regionFrom}`, onClear: () => setRegionFrom('All') });
  }
  if (showCorridorFilters && regionTo !== 'All') {
    chips.push({ key: 'to', label: `To ${regionTo}`, onClear: () => setRegionTo('All') });
  }

  const yearOptions = Array.from({ length: MAX_YEAR - 2025 + 1 }, (_, i) => {
    const y = 2025 + i;
    return { value: String(y), label: String(y) };
  });
  const monthOptions = MONTHS.slice(0, maxMonthForYear(year)).map((name, i) => ({
    value: String(i + 1),
    label: name,
  }));

  const filterControls = (
    <>
      <div className="space-y-5">
        <div>
          <label className="kicker mb-2 block">Month</label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Latest complete calendar month. Never the current month.
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Year</label>
              <FilterSelect
                ariaLabel="Year"
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
                options={yearOptions}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Month</label>
              <FilterSelect
                ariaLabel="Month"
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
                options={monthOptions}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Display currency</label>
          <div className="flex gap-1 bg-slate-100 dark:bg-neutral-900 rounded-lg p-1">
            {(['USD', 'EUR'] as const).map((currency) => (
              <button
                key={currency}
                onClick={() => setDisplayCurrency(currency)}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-ui ${
                  displayCurrency === currency
                    ? 'text-white'
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
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Reference currency</label>
            <FilterSelect
              ariaLabel="Reference currency"
              value={referenceAsset}
              onValueChange={setReferenceAsset}
              options={['All', 'USD', 'EUR'].map((v) => ({ value: v, label: v }))}
            />
          </div>
        )}

        {showCorridorFilters && (
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Stablecoin</label>
            <FilterSelect
              ariaLabel="Stablecoin"
              value={stablecoin}
              onValueChange={setStablecoin}
              options={[
                { value: 'All', label: 'All' },
                ...stablecoinOptions.map((symbol) => ({ value: symbol, label: symbol })),
              ]}
            />
          </div>
        )}

        {showCorridorFilters && (
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1 font-medium">Region from</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Stored WorldRegion values (Latin America, MENA, East Asia…).
            </p>
            <FilterSelect
              ariaLabel="Region from"
              value={regionFrom}
              onValueChange={setRegionFrom}
              options={[{ value: 'All', label: 'All' }, ...REGIONS.map((v) => ({ value: v, label: v }))]}
            />
          </div>
        )}

        {showCorridorFilters && (
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Region to</label>
            <FilterSelect
              ariaLabel="Region to"
              value={regionTo}
              onValueChange={setRegionTo}
              options={[{ value: 'All', label: 'All' }, ...REGIONS.map((v) => ({ value: v, label: v }))]}
            />
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-200/50 dark:border-neutral-700 space-y-3">
        <div className="text-xs font-semibold text-[var(--ink-text)]">Active filters</div>
        {chips.length === 0 ? (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {MONTHS[month - 1]} {year}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClear}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--brand)]/10 dark:bg-[var(--brand)]/20 text-[var(--brand-700)] dark:text-[var(--brand-300)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--brand)]/20 transition-ui"
              >
                {chip.label}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {hasNonDefaultFilters && (
          <button
            onClick={handleResetFilters}
            className="w-full text-xs border border-slate-200/50 dark:border-neutral-700 hover:border-[var(--brand)] hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg transition-ui font-medium"
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-[var(--hairline)] space-y-2 text-xs text-[var(--muted-ink)] leading-relaxed">
        <div className="font-semibold text-[var(--ink-text)]">How to read this</div>
        <p>
          <b className="text-slate-600 dark:text-slate-300">Wallets per 100k</b> is wallets ÷ World Bank population. Rank only includes countries with more than 10,000 wallets.
        </p>
        <p>
          <b className="text-slate-600 dark:text-slate-300">Digital dollars</b> is the share of corridor USD volume in USD-referenced stablecoins.
        </p>
        <p>
          <b className="text-slate-600 dark:text-slate-300">Vs remittances</b> uses World Bank annual remittances sent, divided by 12. Not a monthly series.
        </p>
        <p>
          <b className="text-slate-600 dark:text-slate-300">Live framework</b> is regulatory stage and does not change with the month slider.
        </p>
        <p>
          Corridor maps are <b className="text-slate-600 dark:text-slate-300">international pairs only</b>. Domestic volume is not in this dataset.
        </p>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-[19.5rem] lg:shrink-0 border-l border-[var(--hairline)] bg-[var(--paper-raised)] p-6 sm:p-7 space-y-6">
        <h2 className="display text-2xl text-[var(--ink-text)]">Filters</h2>
        {filterControls}
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open filters"
        className="lg:hidden fixed bottom-5 left-5 z-40 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-ui hover:scale-105"
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
            className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-neutral-800 p-6 shadow-lg space-y-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-200"
          >
            <div className="mx-auto -mt-2 mb-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-neutral-600" />
            <div className="flex items-center justify-between">
              <DialogPrimitive.Title className="font-semibold text-lg text-slate-800 dark:text-slate-100">Filters</DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close filters"
                className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-ui"
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

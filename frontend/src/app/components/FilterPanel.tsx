import { useFilters } from '../context/FilterContext';
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
    setYear,
    setMonth,
    setReferenceAsset,
    setStablecoin,
    setCountry,
    setRegionFrom,
    setRegionTo,
  } = useFilters();

  return (
    <aside className="w-80 border-l border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 space-y-6 shadow-lg transition-colors">
      <div>
        <h2 className="font-semibold text-lg mb-4 text-slate-800 dark:text-slate-100">Filters</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-3 font-medium">Historic State</label>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                  <span>Year</span>
                  <span className="font-semibold">{year}</span>
                </div>
                <Slider
                  value={[year]}
                  onValueChange={([val]) => setYear(val)}
                  min={2020}
                  max={2026}
                  step={1}
                  className="relative flex items-center w-full h-5"
                >
                  <div className="relative h-1 w-full bg-slate-300 dark:bg-neutral-700 rounded">
                    <div className="absolute h-1 rounded" style={{ width: `${((year - 2020) / 6) * 100}%`, backgroundColor: 'var(--brand)' }} />
                  </div>
                  <div className="absolute h-4 w-4 rounded-full shadow-md cursor-pointer border-2 border-white" style={{ left: `${((year - 2020) / 6) * 100}%`, transform: 'translateX(-50%)', backgroundColor: 'var(--brand)' }} />
                </Slider>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                  <span>Month</span>
                  <span className="font-semibold">{MONTHS[month - 1]}</span>
                </div>
                <Slider
                  value={[month]}
                  onValueChange={([val]) => setMonth(val)}
                  min={1}
                  max={12}
                  step={1}
                  className="relative flex items-center w-full h-5"
                >
                  <div className="relative h-1 w-full bg-slate-300 dark:bg-neutral-700 rounded">
                    <div className="absolute h-1 rounded" style={{ width: `${((month - 1) / 11) * 100}%`, backgroundColor: 'var(--brand)' }} />
                  </div>
                  <div className="absolute h-4 w-4 rounded-full shadow-md cursor-pointer border-2 border-white" style={{ left: `${((month - 1) / 11) * 100}%`, transform: 'translateX(-50%)', backgroundColor: 'var(--brand)' }} />
                </Slider>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Reference Asset</label>
            <select
              value={referenceAsset}
              onChange={(e) => setReferenceAsset(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border-2 border-slate-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="Gold">Gold</option>
              <option value="BTC">BTC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Stablecoin</label>
            <select
              value={stablecoin}
              onChange={(e) => setStablecoin(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border-2 border-slate-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none"
            >
              <option value="All">All</option>
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="EURC">EURC</option>
              <option value="DAI">DAI</option>
              <option value="BUSD">BUSD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border-2 border-slate-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none"
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

          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Region From</label>
            <select
              value={regionFrom}
              onChange={(e) => setRegionFrom(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border-2 border-slate-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none"
            >
              <option value="All">All</option>
              <option value="North America">North America</option>
              <option value="South America">South America</option>
              <option value="Europe">Europe</option>
              <option value="Asia">Asia</option>
              <option value="Africa">Africa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">Region To</label>
            <select
              value={regionTo}
              onChange={(e) => setRegionTo(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border-2 border-slate-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-[var(--brand)] focus:outline-none"
            >
              <option value="All">All</option>
              <option value="North America">North America</option>
              <option value="South America">South America</option>
              <option value="Europe">Europe</option>
              <option value="Asia">Asia</option>
              <option value="Africa">Africa</option>
            </select>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t-2 border-slate-200 dark:border-neutral-700">
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <div className="mb-2 font-semibold text-slate-800 dark:text-slate-100">Active filters:</div>
          <div className="space-y-1">
            <div>Period: <span className="text-slate-800 dark:text-slate-200 font-medium">{MONTHS[month - 1]} {year}</span></div>
            <div>Asset: <span className="text-slate-800 dark:text-slate-200 font-medium">{referenceAsset}</span></div>
            {stablecoin !== 'All' && <div>Coin: <span className="text-slate-800 dark:text-slate-200 font-medium">{stablecoin}</span></div>}
            {country !== 'All' && <div>Country: <span className="text-slate-800 dark:text-slate-200 font-medium">{country}</span></div>}
            {regionFrom !== 'All' && <div>Region From: <span className="text-slate-800 dark:text-slate-200 font-medium">{regionFrom}</span></div>}
            {regionTo !== 'All' && <div>Region To: <span className="text-slate-800 dark:text-slate-200 font-medium">{regionTo}</span></div>}
          </div>
        </div>

        {(country !== 'All' || regionFrom !== 'All' || regionTo !== 'All' || stablecoin !== 'All') && (
          <button
            onClick={() => {
              setCountry('All');
              setRegionFrom('All');
              setRegionTo('All');
              setStablecoin('All');
            }}
            className="mt-3 w-full text-xs border-2 border-slate-300 dark:border-neutral-700 hover:border-[var(--brand)] hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg transition-colors font-medium"
          >
            Clear All Filters
          </button>
        )}
      </div>
    </aside>
  );
}

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';

export type MapType = 'adoption' | 'corridors' | 'regulation';
export type DisplayCurrency = 'USD' | 'EUR';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;

/** Calendar cap: previous calendar month — never the current month or the future. */
export const MAX_YEAR = CURRENT_MONTH === 1 ? CURRENT_YEAR - 1 : CURRENT_YEAR;

export function maxMonthForYear(year: number): number {
  if (year < MAX_YEAR) return 12;
  return CURRENT_MONTH === 1 ? 12 : CURRENT_MONTH - 1;
}

function earlierPeriod(
  a: { year: number; month: number },
  b: { year: number; month: number },
): { year: number; month: number } {
  if (a.year < b.year) return a;
  if (a.year > b.year) return b;
  return a.month <= b.month ? a : b;
}

/** Previous calendar month relative to the given period, for month-over-month comparisons. */
export function getPreviousPeriod(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

interface FilterContextType {
  year: number;
  month: number;
  maxYear: number;
  maxMonthForYear: (year: number) => number;
  referenceAsset: string;
  stablecoin: string;
  regionFrom: string;
  regionTo: string;
  mapType: MapType;
  displayCurrency: DisplayCurrency;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  setReferenceAsset: (asset: string) => void;
  setStablecoin: (coin: string) => void;
  setRegionFrom: (region: string) => void;
  setRegionTo: (region: string) => void;
  setMapType: (mapType: MapType) => void;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [maxYear, setMaxYear] = useState(MAX_YEAR);
  const [maxMonth, setMaxMonth] = useState(maxMonthForYear(MAX_YEAR));
  const [year, setYearState] = useState(MAX_YEAR);
  const [month, setMonthState] = useState(maxMonthForYear(MAX_YEAR));
  const [referenceAsset, setReferenceAsset] = useState('All');
  const [stablecoin, setStablecoin] = useState('All');
  const [regionFrom, setRegionFrom] = useState('All');
  const [regionTo, setRegionTo] = useState('All');
  const [mapType, setMapType] = useState<MapType>('adoption');
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD');

  const monthCap = useCallback(
    (y: number) => {
      if (y < maxYear) return 12;
      if (y === maxYear) return maxMonth;
      return 0;
    },
    [maxYear, maxMonth],
  );

  useEffect(() => {
    let cancelled = false;
    api
      .getLatestPeriod()
      .then((data) => {
        if (cancelled || !data?.year || !data?.month) return;
        const capped = earlierPeriod(data, { year: MAX_YEAR, month: maxMonthForYear(MAX_YEAR) });
        setMaxYear(capped.year);
        setMaxMonth(capped.month);
        setYearState(capped.year);
        setMonthState(capped.month);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const setYear = (newYear: number) => {
    const clampedYear = Math.min(newYear, maxYear);
    setYearState(clampedYear);
    setMonthState((m) => Math.min(m, monthCap(clampedYear)));
  };

  const setMonth = (newMonth: number) => {
    setMonthState(Math.min(newMonth, monthCap(year)));
  };

  return (
    <FilterContext.Provider
      value={{
        year,
        month,
        maxYear,
        maxMonthForYear: monthCap,
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
        setMapType,
        setDisplayCurrency,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}

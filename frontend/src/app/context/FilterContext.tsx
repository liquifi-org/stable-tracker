import { createContext, useContext, useState, ReactNode } from 'react';

export type MapType = 'adoption' | 'corridors' | 'regulation';
export type DisplayCurrency = 'USD' | 'EUR';

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;

/** Latest selectable period is the previous calendar month — never the current month or the future. */
export const MAX_YEAR = CURRENT_MONTH === 1 ? CURRENT_YEAR - 1 : CURRENT_YEAR;

export function maxMonthForYear(year: number): number {
  if (year < MAX_YEAR) return 12;
  return CURRENT_MONTH === 1 ? 12 : CURRENT_MONTH - 1;
}

/** Previous calendar month relative to the given period, for month-over-month comparisons. */
export function getPreviousPeriod(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

interface FilterContextType {
  year: number;
  month: number;
  referenceAsset: string;
  stablecoin: string;
  country: string;
  regionFrom: string;
  regionTo: string;
  mapType: MapType;
  displayCurrency: DisplayCurrency;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  setReferenceAsset: (asset: string) => void;
  setStablecoin: (coin: string) => void;
  setCountry: (country: string) => void;
  setRegionFrom: (region: string) => void;
  setRegionTo: (region: string) => void;
  setMapType: (mapType: MapType) => void;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [year, setYearState] = useState(MAX_YEAR);
  const [month, setMonthState] = useState(maxMonthForYear(MAX_YEAR));
  const [referenceAsset, setReferenceAsset] = useState('All');
  const [stablecoin, setStablecoin] = useState('All');
  const [country, setCountry] = useState('All');
  const [regionFrom, setRegionFrom] = useState('All');
  const [regionTo, setRegionTo] = useState('All');
  const [mapType, setMapType] = useState<MapType>('adoption');
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD');

  const setYear = (newYear: number) => {
    const clampedYear = Math.min(newYear, MAX_YEAR);
    setYearState(clampedYear);
    setMonthState((m) => Math.min(m, maxMonthForYear(clampedYear)));
  };

  const setMonth = (newMonth: number) => {
    setMonthState(Math.min(newMonth, maxMonthForYear(year)));
  };

  return (
    <FilterContext.Provider
      value={{
        year,
        month,
        referenceAsset,
        stablecoin,
        country,
        regionFrom,
        regionTo,
        mapType,
        displayCurrency,
        setYear,
        setMonth,
        setReferenceAsset,
        setStablecoin,
        setCountry,
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

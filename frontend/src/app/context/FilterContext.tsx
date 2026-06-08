import { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
  year: number;
  month: number;
  referenceAsset: string;
  stablecoin: string;
  country: string;
  regionFrom: string;
  regionTo: string;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  setReferenceAsset: (asset: string) => void;
  setStablecoin: (coin: string) => void;
  setCountry: (country: string) => void;
  setRegionFrom: (region: string) => void;
  setRegionTo: (region: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(4);
  const [referenceAsset, setReferenceAsset] = useState('USD');
  const [stablecoin, setStablecoin] = useState('All');
  const [country, setCountry] = useState('All');
  const [regionFrom, setRegionFrom] = useState('All');
  const [regionTo, setRegionTo] = useState('All');

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
        setYear,
        setMonth,
        setReferenceAsset,
        setStablecoin,
        setCountry,
        setRegionFrom,
        setRegionTo,
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

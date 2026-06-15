import { useState, useMemo } from 'react';
import { RealWorldMap } from '../components/RealWorldMap';
import { RealCorridorMap } from '../components/RealCorridorMap';
import { DataTable } from '../components/DataTable';
import { countries, corridors, getCountryName } from '../data/mockData';
import { useFilters } from '../context/FilterContext';

type MapType = 'adoption' | 'corridors';

export function MainView() {
  const [selectedMap, setSelectedMap] = useState<MapType>('adoption');
  const filters = useFilters();

  const filteredCountries = useMemo(() => {
    let filtered = [...countries];

    // Filter by specific country
    if (filters.country !== 'All') {
      filtered = filtered.filter(country => country.code === filters.country);
    }

    // Filter by region
    if (filters.regionFrom !== 'All') {
      filtered = filtered.filter(country => country.region === filters.regionFrom);
    }

    return filtered;
  }, [filters.country, filters.regionFrom, filters.stablecoin, filters.year, filters.month]);

  const filteredCorridors = useMemo(() => {
    let filtered = [...corridors];

    // Filter by specific country (origin or destination)
    if (filters.country !== 'All') {
      filtered = filtered.filter(corridor =>
        corridor.from === filters.country || corridor.to === filters.country
      );
    }

    // Filter by origin region
    if (filters.regionFrom !== 'All') {
      filtered = filtered.filter(corridor => {
        const fromCountry = countries.find(c => c.code === corridor.from);
        return fromCountry?.region === filters.regionFrom;
      });
    }

    // Filter by destination region
    if (filters.regionTo !== 'All') {
      filtered = filtered.filter(corridor => {
        const toCountry = countries.find(c => c.code === corridor.to);
        return toCountry?.region === filters.regionTo;
      });
    }

    return filtered;
  }, [filters.country, filters.regionFrom, filters.regionTo, filters.stablecoin, filters.year, filters.month]);

  const bidirectionalCorridors = useMemo(() => {
    const corridorMap = new Map();

    filteredCorridors.forEach(corridor => {
      const countries_pair = [corridor.from, corridor.to].sort();
      const key = `${countries_pair[0]}-${countries_pair[1]}`;

      if (!corridorMap.has(key)) {
        corridorMap.set(key, {
          country1: countries_pair[0],
          country2: countries_pair[1],
          valueFromCountry1: 0,
          valueFromCountry2: 0,
          totalValue: 0,
          dollarization: corridor.dollarization,
        });
      }

      const bidirectional = corridorMap.get(key);

      if (corridor.from === countries_pair[0]) {
        bidirectional.valueFromCountry1 += corridor.value;
      } else {
        bidirectional.valueFromCountry2 += corridor.value;
      }

      bidirectional.totalValue = bidirectional.valueFromCountry1 + bidirectional.valueFromCountry2;
    });

    return Array.from(corridorMap.values());
  }, [filteredCorridors]);

  const heatmapColumns = [
    { key: 'name', header: 'Country' },
    {
      key: 'wallets',
      header: '# active wallets holding stablecoins (m)',
      render: (value: number) => (value / 1000000).toFixed(2)
    },
    {
      key: 'txPercentage',
      header: 'Stablecoin transaction value as % of total transaction value',
      render: (value: number) => value.toFixed(2) + '%'
    },
  ];

  const corridorTableColumns = [
    {
      key: 'from',
      header: 'Country from',
      render: (value: string) => getCountryName(value)
    },
    {
      key: 'to',
      header: 'Country to',
      render: (value: string) => getCountryName(value)
    },
    {
      key: 'value',
      header: 'Total corridor value ($b)',
      render: (value: number) => (value / 1000000000).toFixed(1)
    },
    {
      key: 'dollarization',
      header: 'Dollarization index',
      render: (value: number) => Math.round(value * 100) + '%'
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Global Overview</h2>

      <div className="flex gap-3">
        <button
          onClick={() => setSelectedMap('adoption')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-sm ${
            selectedMap === 'adoption'
              ? 'text-white shadow-md'
              : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 border border-slate-200/50 dark:border-neutral-700'
          }`}
          style={selectedMap === 'adoption' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Adoption Heatmap
        </button>
        <button
          onClick={() => setSelectedMap('corridors')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-sm ${
            selectedMap === 'corridors'
              ? 'text-white shadow-md'
              : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 border border-slate-200/50 dark:border-neutral-700'
          }`}
          style={selectedMap === 'corridors' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Corridor Flows
        </button>
      </div>

      <div className="space-y-6">
        {selectedMap === 'adoption' ? (
          <RealWorldMap countries={filteredCountries} key={`adoption-${filters.country}-${filters.regionFrom}`} />
        ) : (
          <RealCorridorMap corridors={bidirectionalCorridors} getCountryName={getCountryName} key={`corridors-${filters.country}-${filters.regionFrom}-${filters.regionTo}`} />
        )}

        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {selectedMap === 'adoption' ? 'Country Adoption Details' : 'Corridor Flow Details'}
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {selectedMap === 'adoption'
                ? `Showing ${filteredCountries.length} ${filteredCountries.length === 1 ? 'country' : 'countries'}`
                : `Showing ${filteredCorridors.length} ${filteredCorridors.length === 1 ? 'corridor' : 'corridors'}`
              }
            </div>
          </div>
          {selectedMap === 'adoption' && filteredCountries.length === 0 && (
            <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
              No countries match the current filters
            </div>
          )}
          {selectedMap === 'corridors' && filteredCorridors.length === 0 && (
            <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
              No corridors match the current filters
            </div>
          )}
          {((selectedMap === 'adoption' && filteredCountries.length > 0) ||
            (selectedMap === 'corridors' && filteredCorridors.length > 0)) && (
            <DataTable
              data={selectedMap === 'adoption' ? filteredCountries : filteredCorridors}
              columns={selectedMap === 'adoption' ? heatmapColumns : corridorTableColumns}
              pageSize={10}
            />
          )}
        </div>
      </div>
    </div>
  );
}

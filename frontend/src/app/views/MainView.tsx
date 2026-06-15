import { useState, useMemo, useEffect } from 'react';
import { RealWorldMap } from '../components/RealWorldMap';
import { RealCorridorMap } from '../components/RealCorridorMap';
import { DataTable } from '../components/DataTable';
import { useFilters } from '../context/FilterContext';
import { api, type CountryAdoptionMetric, type CorridorFlow } from '../services/api';

function formatRemittances(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

type MapType = 'adoption' | 'corridors';

function formatValue(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

export function MainView() {
  const [selectedMap, setSelectedMap] = useState<MapType>('adoption');
  const [adoptionData, setAdoptionData] = useState<CountryAdoptionMetric[]>([]);
  const [adoptionLoading, setAdoptionLoading] = useState(false);
  const [corridorData, setCorridorData] = useState<CorridorFlow[]>([]);
  const [corridorLoading, setCorridorLoading] = useState(false);
  const filters = useFilters();

  useEffect(() => {
    setAdoptionLoading(true);
    api.getAdoptionAnalytics(filters.year)
      .then(data => setAdoptionData(data))
      .catch(() => setAdoptionData([]))
      .finally(() => setAdoptionLoading(false));
  }, [filters.year]);

  useEffect(() => {
    setCorridorLoading(true);
    api.getCorridors(filters.year, filters.month, filters.regionFrom, filters.regionTo)
      .then(data => setCorridorData(data))
      .catch(() => setCorridorData([]))
      .finally(() => setCorridorLoading(false));
  }, [filters.year, filters.month, filters.regionFrom, filters.regionTo]);

  const numericToAlpha2 = useMemo(
    () => new Map(adoptionData.map(c => [c.countryId, c.isoAlpha2])),
    [adoptionData]
  );

  const alpha2ToNumeric = useMemo(
    () => new Map(adoptionData.map(c => [c.isoAlpha2, c.countryId])),
    [adoptionData]
  );

  const countryNameByAlpha2 = useMemo(
    () => new Map(adoptionData.map(c => [c.isoAlpha2, c.name])),
    [adoptionData]
  );

  const filteredCountries = useMemo(() => {
    let filtered = [...adoptionData];

    if (filters.country !== 'All') {
      const numericId = alpha2ToNumeric.get(filters.country) ?? '';
      if (numericId) filtered = filtered.filter(c => c.countryId === numericId);
    }

    if (filters.regionFrom !== 'All') {
      filtered = filtered.filter(c => c.region === filters.regionFrom);
    }

    return filtered;
  }, [adoptionData, alpha2ToNumeric, filters.country, filters.regionFrom]);

  // Group directional API flows into bidirectional pairs for the map
  const bidirectionalCorridors = useMemo(() => {
    const pairMap = new Map<string, {
      country1: string;
      country2: string;
      valueFromCountry1: number;
      valueFromCountry2: number;
      totalValue: number;
      dollarizationIndex: number;
      topStablecoinsFrom1?: { name: string; share: number }[];
      topStablecoinsFrom2?: { name: string; share: number }[];
    }>();

    for (const flow of corridorData) {
      const alpha2From = numericToAlpha2.get(flow.from);
      const alpha2To = numericToAlpha2.get(flow.to);
      if (!alpha2From || !alpha2To) continue;

      const [c1, c2] = [alpha2From, alpha2To].sort();
      const key = `${c1}-${c2}`;

      if (!pairMap.has(key)) {
        pairMap.set(key, {
          country1: c1,
          country2: c2,
          valueFromCountry1: 0,
          valueFromCountry2: 0,
          totalValue: 0,
          dollarizationIndex: flow.dollarizationIndex,
        });
      }

      const pair = pairMap.get(key)!;
      const tokens = flow.topStablecoins?.map(s => ({ name: s.name, share: s.share }));

      if (alpha2From === c1) {
        pair.valueFromCountry1 += flow.value.amount;
        if (tokens) pair.topStablecoinsFrom1 = tokens;
      } else {
        pair.valueFromCountry2 += flow.value.amount;
        if (tokens) pair.topStablecoinsFrom2 = tokens;
      }
      pair.totalValue = pair.valueFromCountry1 + pair.valueFromCountry2;
    }

    let result = Array.from(pairMap.values());

    if (filters.country !== 'All') {
      result = result.filter(c => c.country1 === filters.country || c.country2 === filters.country);
    }

    return result;
  }, [corridorData, numericToAlpha2, filters.country]);

  // Per-country aggregation: sum of outbound corridor volumes / remittances sent (World Bank)
  const corridorsByCountry = useMemo(() => {
    const outboundMap = new Map<string, number>(); // alpha2 → total USD outbound

    for (const pair of bidirectionalCorridors) {
      outboundMap.set(pair.country1, (outboundMap.get(pair.country1) ?? 0) + pair.valueFromCountry1);
      outboundMap.set(pair.country2, (outboundMap.get(pair.country2) ?? 0) + pair.valueFromCountry2);
    }

    // Build numeric → remittancesSent lookup from adoption data
    const remittancesMap = new Map<string, number | undefined>(
      adoptionData.map(c => [c.countryId, c.remittancesSent])
    );

    return Array.from(outboundMap.entries())
      .map(([alpha2, outboundVolume]) => {
        const numericId = alpha2ToNumeric.get(alpha2) ?? '';
        const remittancesSent = remittancesMap.get(numericId);
        const stablecoinPctOfRemittances =
          remittancesSent && remittancesSent > 0 ? outboundVolume / remittancesSent : null;
        return {
          alpha2,
          name: countryNameByAlpha2.get(alpha2) ?? alpha2,
          outboundVolume,
          remittancesSent: remittancesSent ?? null,
          stablecoinPctOfRemittances,
        };
      })
      .sort((a, b) => b.outboundVolume - a.outboundVolume);
  }, [bidirectionalCorridors, alpha2ToNumeric, countryNameByAlpha2]);

  const heatmapColumns = [
    { key: 'name', header: 'Country' },
    {
      key: 'activeWallets',
      header: '# active wallets holding stablecoins',
      render: (value: number) => value.toLocaleString()
    },
    {
      key: 'adoptionRate',
      header: '% of population using stablecoins',
      render: (value: number) => (value * 100).toFixed(4) + '%'
    },
    {
      key: 'txValueShare',
      header: 'Stablecoin TX value as % of total',
      render: (value: number) => (value * 100).toFixed(2) + '%'
    },
  ];

  const corridorTableColumns = [
    {
      key: 'name',
      header: 'Country',
    },
    {
      key: 'outboundVolume',
      header: 'Outbound stablecoin volume',
      render: (value: number) => formatValue(value)
    },
    {
      key: 'remittancesSent',
      header: 'Remittances sent (World Bank)',
      render: (value: number | null) => value != null ? formatRemittances(value) : '—'
    },
    {
      key: 'stablecoinPctOfRemittances',
      header: 'Stablecoin TX value as % of total',
      render: (value: number | null) => value != null ? (value * 100).toFixed(2) + '%' : '—'
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Global Overview</h2>

      <div className="flex gap-3">
        <button
          onClick={() => setSelectedMap('adoption')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-md ${
            selectedMap === 'adoption'
              ? 'text-white'
              : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 border border-slate-200/50 dark:border-neutral-700'
          }`}
          style={selectedMap === 'adoption' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Adoption Heatmap
        </button>
        <button
          onClick={() => setSelectedMap('corridors')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-md ${
            selectedMap === 'corridors'
              ? 'text-white'
              : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 border border-slate-200/50 dark:border-neutral-700'
          }`}
          style={selectedMap === 'corridors' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Corridor Flows
        </button>
      </div>

      <div className="space-y-6">
        {selectedMap === 'adoption' ? (
          adoptionLoading ? (
            <div className="bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200/50 dark:border-neutral-700 p-8 flex items-center justify-center" style={{ height: '600px' }}>
              <div className="text-slate-400">Loading adoption data…</div>
            </div>
          ) : (
            <RealWorldMap countries={filteredCountries} key={`adoption-${filters.country}-${filters.regionFrom}`} />
          )
        ) : corridorLoading ? (
          <div className="bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200/50 dark:border-neutral-700 p-8 flex items-center justify-center" style={{ height: '600px' }}>
            <div className="text-slate-400">Loading corridor data…</div>
          </div>
        ) : (
          <RealCorridorMap
            corridors={bidirectionalCorridors}
            getCountryName={(alpha2) => countryNameByAlpha2.get(alpha2) ?? alpha2}
            limit={filters.country === 'All' ? 20 : undefined}
            key={`corridors-${filters.country}-${filters.regionFrom}-${filters.regionTo}-${filters.year}-${filters.month}`}
          />
        )}

        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {selectedMap === 'adoption' ? 'Country Adoption Details' : 'Corridor Activity by Country'}
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {selectedMap === 'adoption'
                ? `Showing ${filteredCountries.length} ${filteredCountries.length === 1 ? 'country' : 'countries'}`
                : `Showing ${corridorsByCountry.length} ${corridorsByCountry.length === 1 ? 'country' : 'countries'}`
              }
            </div>
          </div>
          {selectedMap === 'adoption' && filteredCountries.length === 0 && (
            <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
              No countries match the current filters
            </div>
          )}
          {selectedMap === 'corridors' && corridorsByCountry.length === 0 && !corridorLoading && (
            <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
              No corridors match the current filters
            </div>
          )}
          {((selectedMap === 'adoption' && filteredCountries.length > 0) ||
            (selectedMap === 'corridors' && corridorsByCountry.length > 0)) && (
            <DataTable
              data={selectedMap === 'adoption' ? filteredCountries : corridorsByCountry}
              columns={selectedMap === 'adoption' ? heatmapColumns : corridorTableColumns}
              pageSize={10}
            />
          )}
        </div>
      </div>
    </div>
  );
}

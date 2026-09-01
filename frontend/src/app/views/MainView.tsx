import { useState, useMemo, useEffect } from 'react';
import { RealWorldMap } from '../components/RealWorldMap';
import { RealCorridorMap } from '../components/RealCorridorMap';
import { RegulationPanel } from '../components/RegulationPanel';
import { DataTable } from '../components/DataTable';
import { CountryFlag } from '../components/CountryFlag';
import { GlobalInsightsBar } from '../components/GlobalInsightsBar';
import { TrendBadge } from '../components/TrendBadge';
import { SourceBadge, type DataSource } from '../components/SourceBadge';
import { useFilters, getPreviousPeriod } from '../context/FilterContext';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';
import { api, type CountryAdoptionMetric, type CorridorFlow, type RegionalAdoptionMetric, type GlobalInsights } from '../services/api';

type AdoptionViewMode = 'country' | 'region';
type CorridorViewMode = 'country' | 'region';

function headerWithSource(text: string, source: DataSource) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {text}
      <SourceBadge source={source} label={text} variant="white" />
    </span>
  );
}

export function MainView() {
  const [adoptionData, setAdoptionData] = useState<CountryAdoptionMetric[]>([]);
  const [adoptionLoading, setAdoptionLoading] = useState(false);
  const [regionalData, setRegionalData] = useState<RegionalAdoptionMetric[]>([]);
  const [regionalLoading, setRegionalLoading] = useState(false);
  const [adoptionViewMode, setAdoptionViewMode] = useState<AdoptionViewMode>('country');
  const [corridorData, setCorridorData] = useState<CorridorFlow[]>([]);
  const [corridorLoading, setCorridorLoading] = useState(false);
  const [corridorViewMode, setCorridorViewMode] = useState<CorridorViewMode>('country');
  const [globalInsights, setGlobalInsights] = useState<GlobalInsights | null>(null);
  const [globalInsightsLoading, setGlobalInsightsLoading] = useState(false);
  const [previousGlobalInsights, setPreviousGlobalInsights] = useState<GlobalInsights | null>(null);
  const [previousAdoptionData, setPreviousAdoptionData] = useState<CountryAdoptionMetric[]>([]);
  const filters = useFilters();
  const { formatCurrency } = useCurrencyFormat();
  const previousPeriod = getPreviousPeriod(filters.year, filters.month);

  useEffect(() => {
    setGlobalInsightsLoading(true);
    api.getGlobalInsights(filters.year, filters.month)
      .then(data => setGlobalInsights(data))
      .catch(() => setGlobalInsights(null))
      .finally(() => setGlobalInsightsLoading(false));
  }, [filters.year, filters.month]);

  useEffect(() => {
    api.getGlobalInsights(previousPeriod.year, previousPeriod.month)
      .then(data => setPreviousGlobalInsights(data))
      .catch(() => setPreviousGlobalInsights(null));
  }, [previousPeriod.year, previousPeriod.month]);

  useEffect(() => {
    setAdoptionLoading(true);
    api.getAdoptionAnalytics(filters.year, filters.month)
      .then(data => setAdoptionData(data))
      .catch(() => setAdoptionData([]))
      .finally(() => setAdoptionLoading(false));
  }, [filters.year, filters.month]);

  useEffect(() => {
    api.getAdoptionAnalytics(previousPeriod.year, previousPeriod.month)
      .then(data => setPreviousAdoptionData(data))
      .catch(() => setPreviousAdoptionData([]));
  }, [previousPeriod.year, previousPeriod.month]);

  useEffect(() => {
    setRegionalLoading(true);
    api.getRegionalAdoptionAnalytics(filters.year, filters.month)
      .then(data => setRegionalData(data))
      .catch(() => setRegionalData([]))
      .finally(() => setRegionalLoading(false));
  }, [filters.year, filters.month]);

  useEffect(() => {
    setCorridorLoading(true);
    api.getCorridors(filters.year, filters.month, {
      regionFrom: filters.regionFrom,
      regionTo: filters.regionTo,
      stablecoinId: filters.stablecoin,
      referenceAsset: filters.referenceAsset,
    })
      .then(data => setCorridorData(data))
      .catch(() => setCorridorData([]))
      .finally(() => setCorridorLoading(false));
  }, [filters.year, filters.month, filters.regionFrom, filters.regionTo, filters.stablecoin, filters.referenceAsset]);

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

  const numericToMacroRegion = useMemo(
    () => new Map(adoptionData.map(c => [c.countryId, c.macroRegion])),
    [adoptionData]
  );

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

    return Array.from(pairMap.values());
  }, [corridorData, numericToAlpha2]);

  // Group directional flows into bidirectional macro-region pairs (cross-region only —
  // same-region pairs are dropped since there's no meaningful line to draw to itself).
  const regionalCorridors = useMemo(() => {
    const pairMap = new Map<string, {
      region1: string;
      region2: string;
      valueFromRegion1: number;
      valueFromRegion2: number;
      totalValue: number;
      dollarizationIndex: number;
    }>();

    for (const flow of corridorData) {
      const regionFrom = numericToMacroRegion.get(flow.from);
      const regionTo = numericToMacroRegion.get(flow.to);
      if (!regionFrom || !regionTo || regionFrom === regionTo) continue;

      const [r1, r2] = [regionFrom, regionTo].sort();
      const key = `${r1}-${r2}`;

      if (!pairMap.has(key)) {
        pairMap.set(key, {
          region1: r1,
          region2: r2,
          valueFromRegion1: 0,
          valueFromRegion2: 0,
          totalValue: 0,
          dollarizationIndex: flow.dollarizationIndex,
        });
      }

      const pair = pairMap.get(key)!;
      if (regionFrom === r1) {
        pair.valueFromRegion1 += flow.value.amount;
      } else {
        pair.valueFromRegion2 += flow.value.amount;
      }
      pair.totalValue = pair.valueFromRegion1 + pair.valueFromRegion2;
    }

    return Array.from(pairMap.values());
  }, [corridorData, numericToMacroRegion]);

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

  // Adoption table rows: join adoption metrics with outbound-corridor-vs-remittances ratio,
  // excluding countries with no wallets holding stablecoins.
  const adoptionTableData = useMemo(() => {
    const pctMap = new Map(corridorsByCountry.map(c => [c.alpha2, c.stablecoinPctOfRemittances]));
    const previousRankMap = new Map(previousAdoptionData.map(c => [c.countryId, c.adoptionRank]));
    const previousWalletsMap = new Map(previousAdoptionData.map(c => [c.countryId, c.activeWallets]));

    return adoptionData
      .filter(c => c.activeWallets > 0)
      .map(c => {
        const previousRank = previousRankMap.get(c.countryId) ?? null;
        const previousWallets = previousWalletsMap.get(c.countryId) ?? null;
        const rankDelta =
          c.adoptionRank != null && previousRank != null ? previousRank - c.adoptionRank : null;
        const walletsChangePct =
          previousWallets != null && previousWallets > 0
            ? ((c.activeWallets - previousWallets) / previousWallets) * 100
            : null;

        return {
          ...c,
          stablecoinPctOfRemittances: pctMap.get(c.isoAlpha2) ?? null,
          rankDelta,
          walletsChangePct,
        };
      });
  }, [adoptionData, corridorsByCountry, previousAdoptionData]);

  const heatmapColumns = [
    {
      key: 'name',
      header: 'Country',
      render: (value: string, row: CountryAdoptionMetric) => (
        <span className="flex items-center gap-2">
          <CountryFlag isoAlpha2={row.isoAlpha2} />
          {value}
        </span>
      ),
    },
    {
      key: 'adoptionRank',
      header: 'Adoption Index (Rank)',
      render: (value: number | null, row: { rankDelta: number | null }) => (
        <span className="inline-flex items-center gap-2">
          {value != null ? `#${value}` : '—'}
          <TrendBadge value={row.rankDelta} format={(v) => String(v)} />
        </span>
      ),
    },
    {
      key: 'activeWallets',
      header: (
        <span className="flex flex-col gap-0.5">
          {headerWithSource('Wallets holding stablecoins', 'allium')}
          <span className="text-[10px] font-normal text-white/60">% change vs. prev. month</span>
        </span>
      ),
      render: (value: number, row: { walletsChangePct: number | null }) => (
        <span className="inline-flex items-center gap-2">
          {value.toLocaleString()}
          <TrendBadge value={row.walletsChangePct} format={(v) => `${v.toFixed(1)}%`} />
        </span>
      ),
    },
    {
      key: 'stablecoinPctOfRemittances',
      header: 'Stablecoin outgoing payments volume as % of remittances',
      render: (value: number | null) => value != null ? (value * 100).toFixed(2) + '%' : '—'
    },
  ];

  const regionTableColumns = [
    { key: 'region', header: 'Region' },
    { key: 'countryCount', header: 'Countries' },
    {
      key: 'activeWallets',
      header: headerWithSource('Wallets holding stablecoins', 'allium'),
      render: (value: number) => value.toLocaleString()
    },
    {
      key: 'adoptionRate',
      header: '% of population using stablecoins',
      render: (value: number) => (value * 100).toFixed(4) + '%'
    },
    {
      key: 'txValueShare',
      header: headerWithSource('Stablecoin TX value as % of total', 'allium'),
      render: (value: number) => (value * 100).toFixed(2) + '%'
    },
  ];

  const corridorTableColumns = [
    {
      key: 'name',
      header: 'Country',
      render: (value: string, row: { alpha2: string }) => (
        <span className="flex items-center gap-2">
          <CountryFlag isoAlpha2={row.alpha2} />
          {value}
        </span>
      ),
    },
    {
      key: 'outboundVolume',
      header: headerWithSource('Outbound stablecoin volume', 'allium'),
      render: (value: number) => formatCurrency(value)
    },
    {
      key: 'remittancesSent',
      header: 'Remittances sent (World Bank, monthly est.)',
      render: (value: number | null) => value != null ? formatCurrency(value) : '—'
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

      <GlobalInsightsBar data={globalInsights} previousData={previousGlobalInsights} loading={globalInsightsLoading} year={filters.year} month={filters.month} />

      <div className="flex gap-3 items-center flex-wrap">
        <button
          onClick={() => filters.setMapType('adoption')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-md ${
            filters.mapType === 'adoption'
              ? 'text-white'
              : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 border border-slate-200/50 dark:border-neutral-700'
          }`}
          style={filters.mapType === 'adoption' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Adoption Heatmap
        </button>
        <button
          onClick={() => filters.setMapType('corridors')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-md ${
            filters.mapType === 'corridors'
              ? 'text-white'
              : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 border border-slate-200/50 dark:border-neutral-700'
          }`}
          style={filters.mapType === 'corridors' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Corridor Flows
        </button>
        <button
          onClick={() => filters.setMapType('regulation')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-md ${
            filters.mapType === 'regulation'
              ? 'text-white'
              : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 border border-slate-200/50 dark:border-neutral-700'
          }`}
          style={filters.mapType === 'regulation' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Stablecoin Regulation
        </button>

        {(filters.mapType === 'adoption' || filters.mapType === 'corridors') && (
          <div className="ml-auto flex gap-1 bg-slate-100 dark:bg-neutral-900 rounded-lg p-1">
            <button
              onClick={() => filters.mapType === 'adoption' ? setAdoptionViewMode('country') : setCorridorViewMode('country')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                (filters.mapType === 'adoption' ? adoptionViewMode : corridorViewMode) === 'country'
                  ? 'bg-white dark:bg-neutral-700 shadow text-slate-800 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Country
            </button>
            <button
              onClick={() => filters.mapType === 'adoption' ? setAdoptionViewMode('region') : setCorridorViewMode('region')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                (filters.mapType === 'adoption' ? adoptionViewMode : corridorViewMode) === 'region'
                  ? 'bg-white dark:bg-neutral-700 shadow text-slate-800 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Region
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {filters.mapType === 'adoption' ? (
          adoptionLoading || (adoptionViewMode === 'region' && regionalLoading) ? (
            <div className="bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200/50 dark:border-neutral-700 p-8 flex items-center justify-center" style={{ height: '600px' }}>
              <div className="text-slate-400">Loading adoption data…</div>
            </div>
          ) : (
            <RealWorldMap
              countries={adoptionData}
              mode={adoptionViewMode}
              regionalData={regionalData}
              key={`adoption-${adoptionViewMode}`}
            />
          )
        ) : filters.mapType === 'corridors' ? (
          corridorLoading ? (
            <div className="bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200/50 dark:border-neutral-700 p-8 flex items-center justify-center" style={{ height: '600px' }}>
              <div className="text-slate-400">Loading corridor data…</div>
            </div>
          ) : (
            <RealCorridorMap
              corridors={bidirectionalCorridors}
              regionalCorridors={regionalCorridors}
              mode={corridorViewMode}
              getCountryName={(alpha2) => countryNameByAlpha2.get(alpha2) ?? alpha2}
              limit={20}
              key={`corridors-${corridorViewMode}-${filters.regionFrom}-${filters.regionTo}-${filters.year}-${filters.month}`}
            />
          )
        ) : (
          <RegulationPanel />
        )}

        {filters.mapType !== 'regulation' && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {filters.mapType === 'adoption'
                  ? (adoptionViewMode === 'country' ? 'Country Adoption Details' : 'Regional Adoption Details')
                  : 'Corridor Activity by Country'}
              </h4>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {filters.mapType === 'adoption'
                  ? adoptionViewMode === 'country'
                    ? `Showing ${adoptionTableData.length} ${adoptionTableData.length === 1 ? 'country' : 'countries'}`
                    : `Showing ${regionalData.length} ${regionalData.length === 1 ? 'region' : 'regions'}`
                  : `Showing ${corridorsByCountry.length} ${corridorsByCountry.length === 1 ? 'country' : 'countries'}`
                }
              </div>
            </div>
            {filters.mapType === 'adoption' && adoptionViewMode === 'country' && adoptionTableData.length === 0 && (
              <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
                No country adoption data available
              </div>
            )}
            {filters.mapType === 'adoption' && adoptionViewMode === 'region' && regionalData.length === 0 && !regionalLoading && (
              <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
                No regional data available
              </div>
            )}
            {filters.mapType === 'corridors' && corridorsByCountry.length === 0 && !corridorLoading && (
              <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
                No corridors match the current filters
              </div>
            )}
            {((filters.mapType === 'adoption' && adoptionViewMode === 'country' && adoptionTableData.length > 0) ||
              (filters.mapType === 'adoption' && adoptionViewMode === 'region' && regionalData.length > 0) ||
              (filters.mapType === 'corridors' && corridorsByCountry.length > 0)) && (
              <DataTable
                data={
                  filters.mapType === 'adoption'
                    ? (adoptionViewMode === 'country' ? adoptionTableData : regionalData)
                    : corridorsByCountry
                }
                columns={
                  filters.mapType === 'adoption'
                    ? (adoptionViewMode === 'country' ? heatmapColumns : regionTableColumns)
                    : corridorTableColumns
                }
                defaultSortKey={filters.mapType === 'adoption' && adoptionViewMode === 'country' ? 'adoptionRank' : undefined}
                defaultSortDirection="asc"
                pageSize={10}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

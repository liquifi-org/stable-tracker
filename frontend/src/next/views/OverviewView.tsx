import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { RealCorridorMap } from '../../app/components/RealCorridorMap';
import { RegulationPanel } from '../../app/components/RegulationPanel';
import { DataTable } from '../../app/components/DataTable';
import { CountryFlag } from '../../app/components/CountryFlag';
import { TrendBadge } from '../../app/components/TrendBadge';
import { SegmentedControl } from '../components/SegmentedControl';
import { Skeleton } from '../../app/components/ui/skeleton';
import { useFilters, getPreviousPeriod, MONTHS } from '../../app/context/FilterContext';
import { useCurrencyFormat } from '../../app/hooks/useCurrencyFormat';
import {
  api,
  type CountryAdoptionMetric,
  type CorridorFlow,
  type RegionalAdoptionMetric,
  type GlobalInsights,
  type CountryRegulationInfo,
} from '../../app/services/api';
import { fmtPct, fmtPer100k } from '../lib/format';
import { TokenMixBar, NamedCorridorDestRow } from '../components/TokenMixBar';
import { UsageRegulationMatrix, type UsageRuleRow } from '../components/UsageRegulationMatrix';
import { InsightCards, type InsightBreakdown } from '../components/InsightCards';
import { countryPath } from '../../app/lib/countryRoutes';

function isNonUsdTicker(name: string): boolean {
  const n = name.toUpperCase();
  return (
    n.startsWith('EUR') ||
    n === 'XSGD' ||
    n === 'CADC' ||
    n === 'TRYB' ||
    n === 'JPYC' ||
    n === 'TGBP' ||
    n === 'AXCNH' ||
    n === 'EUROC' ||
    n === 'EURT'
  );
}

function formatMultiple(ratio: number): string {
  if (ratio >= 10) return `${ratio.toFixed(0)}×`;
  if (ratio >= 1) return `${ratio.toFixed(1)}×`;
  return fmtPct(ratio);
}

type GeoMode = 'country' | 'region';

function pctChange(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export function OverviewView() {
  const navigate = useNavigate();
  const filters = useFilters();
  const { formatCurrency } = useCurrencyFormat();
  const previousPeriod = getPreviousPeriod(filters.year, filters.month);
  const periodLabel = `${MONTHS[filters.month - 1]} ${filters.year}`;

  const [adoptionData, setAdoptionData] = useState<CountryAdoptionMetric[]>([]);
  const [adoptionLoading, setAdoptionLoading] = useState(false);
  const [regionalData, setRegionalData] = useState<RegionalAdoptionMetric[]>([]);
  const [geoMode, setGeoMode] = useState<GeoMode>('country');
  const [corridorData, setCorridorData] = useState<CorridorFlow[]>([]);
  const [corridorLoading, setCorridorLoading] = useState(false);
  const [previousCorridorVolume, setPreviousCorridorVolume] = useState<number | null>(null);
  const [previousCorridorDollarShare, setPreviousCorridorDollarShare] = useState<number | null>(null);
  const [globalInsights, setGlobalInsights] = useState<GlobalInsights | null>(null);
  const [globalInsightsLoading, setGlobalInsightsLoading] = useState(false);
  const [previousGlobalInsights, setPreviousGlobalInsights] = useState<GlobalInsights | null>(null);
  const [previousAdoptionData, setPreviousAdoptionData] = useState<CountryAdoptionMetric[]>([]);
  const [regulation, setRegulation] = useState<CountryRegulationInfo[]>([]);

  useEffect(() => {
    setGlobalInsightsLoading(true);
    api.getGlobalInsights(filters.year, filters.month)
      .then(setGlobalInsights)
      .catch(() => setGlobalInsights(null))
      .finally(() => setGlobalInsightsLoading(false));
  }, [filters.year, filters.month]);

  useEffect(() => {
    api.getGlobalInsights(previousPeriod.year, previousPeriod.month)
      .then(setPreviousGlobalInsights)
      .catch(() => setPreviousGlobalInsights(null));
  }, [previousPeriod.year, previousPeriod.month]);

  useEffect(() => {
    setAdoptionLoading(true);
    api.getAdoptionAnalytics(filters.year, filters.month)
      .then(setAdoptionData)
      .catch(() => setAdoptionData([]))
      .finally(() => setAdoptionLoading(false));
  }, [filters.year, filters.month]);

  useEffect(() => {
    api.getAdoptionAnalytics(previousPeriod.year, previousPeriod.month)
      .then(setPreviousAdoptionData)
      .catch(() => setPreviousAdoptionData([]));
  }, [previousPeriod.year, previousPeriod.month]);

  useEffect(() => {
    api.getRegionalAdoptionAnalytics(filters.year, filters.month)
      .then(setRegionalData)
      .catch(() => setRegionalData([]));
  }, [filters.year, filters.month]);

  useEffect(() => {
    setCorridorLoading(true);
    api.getCorridors(filters.year, filters.month, {
      regionFrom: filters.regionFrom,
      regionTo: filters.regionTo,
      stablecoinId: filters.stablecoin,
      referenceAsset: filters.referenceAsset,
    })
      .then(setCorridorData)
      .catch(() => setCorridorData([]))
      .finally(() => setCorridorLoading(false));
  }, [filters.year, filters.month, filters.regionFrom, filters.regionTo, filters.stablecoin, filters.referenceAsset]);

  useEffect(() => {
    api.getCorridors(previousPeriod.year, previousPeriod.month, {
      regionFrom: filters.regionFrom,
      regionTo: filters.regionTo,
      stablecoinId: filters.stablecoin,
      referenceAsset: filters.referenceAsset,
    })
      .then((rows) => {
        const volume = rows.reduce((s, f) => s + f.value.amount, 0);
        const usd = rows.reduce((s, f) => s + f.value.amount * f.dollarizationIndex, 0);
        setPreviousCorridorVolume(volume);
        setPreviousCorridorDollarShare(volume > 0 ? usd / volume : null);
      })
      .catch(() => {
        setPreviousCorridorVolume(null);
        setPreviousCorridorDollarShare(null);
      });
  }, [previousPeriod.year, previousPeriod.month, filters.regionFrom, filters.regionTo, filters.stablecoin, filters.referenceAsset]);

  useEffect(() => {
    api.getCountriesRegulation()
      .then((page) => setRegulation(page.items))
      .catch(() => setRegulation([]));
  }, []);

  const numericToAlpha2 = useMemo(
    () => new Map(adoptionData.map((c) => [c.countryId, c.isoAlpha2])),
    [adoptionData],
  );
  const alpha2ToNumeric = useMemo(
    () => new Map(adoptionData.map((c) => [c.isoAlpha2, c.countryId])),
    [adoptionData],
  );
  const countryNameByAlpha2 = useMemo(
    () => new Map(adoptionData.map((c) => [c.isoAlpha2, c.name])),
    [adoptionData],
  );
  const numericToMacroRegion = useMemo(
    () => new Map(adoptionData.map((c) => [c.countryId, c.macroRegion])),
    [adoptionData],
  );

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
      const tokens = flow.topStablecoins?.map((s) => ({ name: s.name, share: s.share }));
      if (alpha2From === c1) {
        pair.valueFromCountry1 += flow.value.amount;
        if (tokens) pair.topStablecoinsFrom1 = tokens;
      } else {
        pair.valueFromCountry2 += flow.value.amount;
        if (tokens) pair.topStablecoinsFrom2 = tokens;
      }
      pair.totalValue = pair.valueFromCountry1 + pair.valueFromCountry2;
    }
    return Array.from(pairMap.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [corridorData, numericToAlpha2]);

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
      if (regionFrom === r1) pair.valueFromRegion1 += flow.value.amount;
      else pair.valueFromRegion2 += flow.value.amount;
      pair.totalValue = pair.valueFromRegion1 + pair.valueFromRegion2;
    }
    return Array.from(pairMap.values());
  }, [corridorData, numericToMacroRegion]);

  const directedCorridors = useMemo(() => {
    const flows = new Map<string, { fromAlpha: string; toAlpha: string; volume: number }>();
    for (const flow of corridorData) {
      const fromAlpha = numericToAlpha2.get(flow.from);
      const toAlpha = numericToAlpha2.get(flow.to);
      if (!fromAlpha || !toAlpha || fromAlpha === toAlpha) continue;
      const key = `${fromAlpha}->${toAlpha}`;
      const existing = flows.get(key);
      if (existing) existing.volume += flow.value.amount;
      else flows.set(key, { fromAlpha, toAlpha, volume: flow.value.amount });
    }
    return Array.from(flows.values()).sort((a, b) => b.volume - a.volume);
  }, [corridorData, numericToAlpha2]);

  const directedRegionalCorridors = useMemo(() => {
    const flows = new Map<string, { fromRegion: string; toRegion: string; volume: number }>();
    for (const flow of corridorData) {
      const fromRegion = numericToMacroRegion.get(flow.from);
      const toRegion = numericToMacroRegion.get(flow.to);
      if (!fromRegion || !toRegion || fromRegion === toRegion) continue;
      const key = `${fromRegion}->${toRegion}`;
      const existing = flows.get(key);
      if (existing) existing.volume += flow.value.amount;
      else flows.set(key, { fromRegion, toRegion, volume: flow.value.amount });
    }
    return Array.from(flows.values()).sort((a, b) => b.volume - a.volume);
  }, [corridorData, numericToMacroRegion]);

  const corridorsGroupedByOrigin = useMemo(() => {
    const groups = new Map<
      string,
      { fromAlpha: string; total: number; dests: { toAlpha: string; volume: number }[] }
    >();
    for (const flow of directedCorridors) {
      const existing = groups.get(flow.fromAlpha);
      if (existing) {
        existing.total += flow.volume;
        existing.dests.push({ toAlpha: flow.toAlpha, volume: flow.volume });
      } else {
        groups.set(flow.fromAlpha, {
          fromAlpha: flow.fromAlpha,
          total: flow.volume,
          dests: [{ toAlpha: flow.toAlpha, volume: flow.volume }],
        });
      }
    }
    return Array.from(groups.values())
      .map((g) => ({ ...g, dests: [...g.dests].sort((a, b) => b.volume - a.volume) }))
      .sort((a, b) => b.total - a.total);
  }, [directedCorridors]);

  const regionalCorridorsGroupedByOrigin = useMemo(() => {
    const groups = new Map<
      string,
      { fromRegion: string; total: number; dests: { toRegion: string; volume: number }[] }
    >();
    for (const flow of directedRegionalCorridors) {
      const existing = groups.get(flow.fromRegion);
      if (existing) {
        existing.total += flow.volume;
        existing.dests.push({ toRegion: flow.toRegion, volume: flow.volume });
      } else {
        groups.set(flow.fromRegion, {
          fromRegion: flow.fromRegion,
          total: flow.volume,
          dests: [{ toRegion: flow.toRegion, volume: flow.volume }],
        });
      }
    }
    return Array.from(groups.values())
      .map((g) => ({ ...g, dests: [...g.dests].sort((a, b) => b.volume - a.volume) }))
      .sort((a, b) => b.total - a.total);
  }, [directedRegionalCorridors]);

  const destsByOriginAlpha = useMemo(
    () => new Map(corridorsGroupedByOrigin.map((g) => [g.fromAlpha, g.dests])),
    [corridorsGroupedByOrigin],
  );
  const destsByOriginRegion = useMemo(
    () => new Map(regionalCorridorsGroupedByOrigin.map((g) => [g.fromRegion, g.dests])),
    [regionalCorridorsGroupedByOrigin],
  );

  const corridorsByCountry = useMemo(() => {
    const outboundMap = new Map<string, number>();
    for (const pair of bidirectionalCorridors) {
      outboundMap.set(pair.country1, (outboundMap.get(pair.country1) ?? 0) + pair.valueFromCountry1);
      outboundMap.set(pair.country2, (outboundMap.get(pair.country2) ?? 0) + pair.valueFromCountry2);
    }
    const dollarVolMap = new Map<string, number>();
    for (const flow of corridorData) {
      const alpha2 = numericToAlpha2.get(flow.from);
      if (!alpha2) continue;
      dollarVolMap.set(alpha2, (dollarVolMap.get(alpha2) ?? 0) + flow.value.amount * flow.dollarizationIndex);
    }
    const remittancesMap = new Map(adoptionData.map((c) => [c.countryId, c.remittancesSent]));
    return Array.from(outboundMap.entries())
      .map(([alpha2, outboundVolume]) => {
        const numericId = alpha2ToNumeric.get(alpha2) ?? '';
        const remittancesSent = remittancesMap.get(numericId);
        return {
          countryId: numericId,
          alpha2,
          name: countryNameByAlpha2.get(alpha2) ?? alpha2,
          outboundVolume,
          dollarizationIndex: outboundVolume > 0 ? (dollarVolMap.get(alpha2) ?? 0) / outboundVolume : null,
          remittancesSent: remittancesSent ?? null,
          stablecoinPctOfRemittances:
            remittancesSent && remittancesSent > 0 ? outboundVolume / remittancesSent : null,
        };
      })
      .sort((a, b) => b.outboundVolume - a.outboundVolume);
  }, [bidirectionalCorridors, corridorData, numericToAlpha2, alpha2ToNumeric, countryNameByAlpha2, adoptionData]);

  const inboundByCountry = useMemo(() => {
    const inbound = new Map<string, number>();
    for (const flow of corridorData) {
      inbound.set(flow.to, (inbound.get(flow.to) ?? 0) + flow.value.amount);
    }
    return inbound;
  }, [corridorData]);

  const adoptionTableData = useMemo(() => {
    const previousRankMap = new Map(previousAdoptionData.map((c) => [c.countryId, c.adoptionRank]));
    const previousWalletsMap = new Map(previousAdoptionData.map((c) => [c.countryId, c.activeWallets]));
    return adoptionData
      .filter((c) =>
        c.activeWallets > 0
        || (c.outboundVolume ?? 0) > 0
        || (inboundByCountry.get(c.countryId) ?? 0) > 0,
      )
      .map((c) => {
        const previousRank = previousRankMap.get(c.countryId) ?? null;
        const previousWallets = previousWalletsMap.get(c.countryId) ?? null;
        return {
          ...c,
          inboundVolume: inboundByCountry.get(c.countryId) ?? 0,
          stablecoinPctOfRemittances:
            c.remittancesSent != null && c.remittancesSent > 0
              ? (c.outboundVolume ?? 0) / c.remittancesSent
              : null,
          rankDelta:
            c.adoptionRank != null && previousRank != null ? previousRank - c.adoptionRank : null,
          walletsChangePct:
            previousWallets != null && previousWallets > 0
              ? ((c.activeWallets - previousWallets) / previousWallets) * 100
              : null,
        };
      });
  }, [adoptionData, previousAdoptionData, inboundByCountry]);

  const tokenMix = useMemo(() => {
    const map = new Map<string, number>();
    let accounted = 0;
    let total = 0;
    for (const flow of corridorData) {
      total += flow.value.amount;
      for (const t of flow.topStablecoins ?? []) {
        const vol = flow.value.amount * t.share;
        accounted += vol;
        map.set(t.name, (map.get(t.name) ?? 0) + vol);
      }
    }
    const items = Array.from(map.entries()).map(([name, volume]) => ({ name, volume }));
    if (total - accounted > 0) items.push({ name: 'Other', volume: total - accounted });
    return items;
  }, [corridorData]);

  const corridorVolume = useMemo(
    () => corridorData.reduce((s, f) => s + f.value.amount, 0),
    [corridorData],
  );
  const corridorDollarShare = useMemo(() => {
    if (corridorVolume <= 0) return null;
    const usd = corridorData.reduce((s, f) => s + f.value.amount * f.dollarizationIndex, 0);
    return usd / corridorVolume;
  }, [corridorData, corridorVolume]);

  const walletBreakdown = useMemo((): InsightBreakdown | null => {
    const ranked = [...adoptionData]
      .filter((c) => c.activeWallets > 0)
      .sort((a, b) => b.activeWallets - a.activeWallets);
    const total = ranked.reduce((sum, c) => sum + c.activeWallets, 0);
    if (total <= 0) return null;
    const top = ranked.slice(0, 5);
    const topSum = top.reduce((sum, c) => sum + c.activeWallets, 0);
    const densest = ranked
      .filter((c) => c.adoptionRate > 0)
      .sort((a, b) => b.adoptionRate - a.adoptionRate)[0];
    const rows = top.map((c) => ({
      label: c.name,
      value: c.activeWallets.toLocaleString(),
      share: c.activeWallets / total,
    }));
    if (ranked.length > 5) {
      rows.push({
        label: `Other ${ranked.length - 5} countries`,
        value: (total - topSum).toLocaleString(),
        share: (total - topSum) / total,
      });
    }
    return {
      caption: 'Share of wallets holding stablecoins',
      bar: top.map((c) => ({ key: c.countryId, share: c.activeWallets / total })),
      rows,
      note: densest
        ? `Densest per 100k: ${densest.name} (${fmtPer100k(densest.adoptionRate)})`
        : undefined,
    };
  }, [adoptionData]);

  const corridorBreakdown = useMemo((): InsightBreakdown | null => {
    if (bidirectionalCorridors.length === 0) return null;
    const total = bidirectionalCorridors.reduce((sum, p) => sum + p.totalValue, 0);
    if (total <= 0) return null;
    const top = bidirectionalCorridors.slice(0, 5);
    const topSum = top.reduce((sum, p) => sum + p.totalValue, 0);
    const nameOf = (alpha: string) => countryNameByAlpha2.get(alpha) ?? alpha;
    const rows = top.map((p) => ({
      label: `${nameOf(p.country1)} – ${nameOf(p.country2)}`,
      value: formatCurrency(p.totalValue),
      share: p.totalValue / total,
    }));
    if (bidirectionalCorridors.length > 5) {
      rows.push({
        label: `Other ${bidirectionalCorridors.length - 5} pairs`,
        value: formatCurrency(total - topSum),
        share: (total - topSum) / total,
      });
    }
    return {
      caption: `${bidirectionalCorridors.length} pairs · domestic not in this data`,
      bar: top.map((p) => ({
        key: `${p.country1}-${p.country2}`,
        share: p.totalValue / total,
      })),
      rows,
    };
  }, [bidirectionalCorridors, countryNameByAlpha2, formatCurrency]);

  const remittanceRatio =
    globalInsights && globalInsights.totalRemittancesUsd > 0
      ? corridorVolume / globalInsights.totalRemittancesUsd
      : null;
  const previousRemittanceRatio =
    previousGlobalInsights && previousGlobalInsights.totalRemittancesUsd > 0 && previousCorridorVolume != null
      ? previousCorridorVolume / previousGlobalInsights.totalRemittancesUsd
      : null;

  const remittanceBreakdown = useMemo((): InsightBreakdown | null => {
    if (remittanceRatio == null || !globalInsights || globalInsights.totalRemittancesUsd <= 0) {
      return null;
    }
    const multiples = corridorsByCountry
      .filter((c) => c.stablecoinPctOfRemittances != null && c.stablecoinPctOfRemittances >= 1)
      .sort((a, b) => (b.stablecoinPctOfRemittances ?? 0) - (a.stablecoinPctOfRemittances ?? 0))
      .slice(0, 5)
      .map((c) => ({
        label: c.name,
        value: `${formatCurrency(c.outboundVolume)} · ${formatMultiple(c.stablecoinPctOfRemittances ?? 0)}`,
      }));
    return {
      caption: `${formatCurrency(corridorVolume)} corridors vs ${formatCurrency(globalInsights.totalRemittancesUsd)} official remittances (annual / 12)`,
      bar: [{ key: 'corridors', share: remittanceRatio }],
      rows: multiples,
      note: 'A comparison of unlike series, not the share of remittances on-chain.',
    };
  }, [remittanceRatio, globalInsights, corridorsByCountry, corridorVolume, formatCurrency]);

  const dollarizationBreakdown = useMemo((): InsightBreakdown | null => {
    if (corridorVolume <= 0 || corridorDollarShare == null) return null;
    const usdVolume = corridorVolume * corridorDollarShare;
    const nonUsdVolume = corridorVolume - usdVolume;
    const tokenVol = new Map<string, number>();
    for (const item of tokenMix) {
      if (isNonUsdTicker(item.name)) tokenVol.set(item.name, item.volume);
    }
    const named = [...tokenVol.entries()].sort((a, b) => b[1] - a[1]);
    const rows = named.slice(0, 5).map(([name, volume]) => ({
      label: name,
      value: formatCurrency(volume),
      share: volume / corridorVolume,
    }));
    if (named.length === 0 && nonUsdVolume > 0) {
      rows.push({
        label: 'Not USD-referenced',
        value: formatCurrency(nonUsdVolume),
        share: nonUsdVolume / corridorVolume,
      });
    }
    return {
      caption: `${formatCurrency(usdVolume)} USD-referenced · ${formatCurrency(nonUsdVolume)} not USD`,
      bar: [{ key: 'usd', share: corridorDollarShare }],
      rows,
      note: 'Named non-USD tokens from corridor top coins. USDT / USDC mix is below.',
    };
  }, [corridorVolume, corridorDollarShare, tokenMix, formatCurrency]);

  const usageRuleRows: UsageRuleRow[] = useMemo(() => {
    const stageMap = new Map(regulation.map((r) => [r.countryId, r.stage]));
    return adoptionData.map((c) => ({
      countryId: c.countryId,
      name: c.name,
      isoAlpha2: c.isoAlpha2,
      gdpIntensity: c.gdpIntensity,
      stage: stageMap.get(c.countryId),
    }));
  }, [adoptionData, regulation]);

  const adoptionColumns = [
    {
      key: 'name',
      header: 'Country',
      render: (value: string, row: CountryAdoptionMetric) => (
        <button
          type="button"
          className="flex items-center gap-2 text-left hover:underline underline-offset-2"
          onClick={(event) => {
            event.stopPropagation();
            navigate(countryPath({ countryId: row.countryId, name: row.name, isoAlpha2: row.isoAlpha2 }), {
              state: { name: row.name, isoAlpha2: row.isoAlpha2 },
            });
          }}
        >
          <CountryFlag isoAlpha2={row.isoAlpha2} />
          {value}
        </button>
      ),
    },
    {
      key: 'inboundVolume',
      header: 'In',
      render: (value: number) => (value > 0 ? formatCurrency(value) : '—'),
    },
    {
      key: 'outboundVolume',
      header: 'Out',
      render: (value: number) => (value > 0 ? formatCurrency(value) : '—'),
    },
    {
      key: 'gdpIntensity',
      header: '% of GDP',
      render: (_: number, row: CountryAdoptionMetric) => (
        <span className="tabular-nums">
          {(row.gdpIntensity ?? 0) > 0 ? fmtPct(row.gdpIntensity) : '—'}
          {row.adoptionRank != null && (
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">#{row.adoptionRank}</span>
          )}
        </span>
      ),
    },
    {
      key: 'activeWallets',
      header: (
        <span>Wallets</span>
      ),
      render: (value: number, row: { walletsChangePct: number | null }) => (
        <span className="inline-flex items-center gap-2">
          {value.toLocaleString()}
          <TrendBadge value={row.walletsChangePct} format={(v) => `${v.toFixed(1)}%`} />
        </span>
      ),
    },
    {
      key: 'adoptionRate',
      header: '% of population',
      render: (value: number, row: CountryAdoptionMetric) =>
        row.population && row.population > 0 ? fmtPct(value) : '—',
    },
    {
      key: 'stablecoinPctOfRemittances',
      header: '% of official remittances',
      render: (value: number | null) => (value != null ? fmtPct(value) : '—'),
    },
  ];

  const regionColumns = [
    { key: 'region', header: 'Region' },
    { key: 'countryCount', header: 'Countries' },
    {
      key: 'activeWallets',
      header: 'Wallets',
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: 'adoptionRate',
      header: '% of GDP',
      render: (value: number) => fmtPct(value),
    },
    {
      key: 'txValueShare',
      header: 'Share of global TX value',
      render: (value: number) => fmtPct(value),
    },
  ];

  const walletsTrend =
    globalInsights && previousGlobalInsights
      ? pctChange(globalInsights.totalActiveWallets, previousGlobalInsights.totalActiveWallets)
      : null;
  const corridorTrend =
    previousCorridorVolume != null && previousCorridorVolume > 0
      ? pctChange(corridorVolume, previousCorridorVolume)
      : null;
  const remittanceTrendPp =
    remittanceRatio != null && previousRemittanceRatio != null
      ? (remittanceRatio - previousRemittanceRatio) * 100
      : null;
  const dollarizationTrendPp =
    corridorDollarShare != null && previousCorridorDollarShare != null
      ? (corridorDollarShare - previousCorridorDollarShare) * 100
      : null;

  const isUsage = filters.mapType !== 'regulation';
  const usageLoading =
    (adoptionLoading && adoptionData.length === 0) || (corridorLoading && corridorData.length === 0);

  const openCountry = (alpha2: string) => {
    const countryId = alpha2ToNumeric.get(alpha2);
    if (!countryId) return;
    const name = countryNameByAlpha2.get(alpha2);
    navigate(countryPath({ countryId, name, isoAlpha2: alpha2 }), {
      state: { name, isoAlpha2: alpha2 },
    });
  };

  return (
    <div className="space-y-8">
      <InsightCards
        periodLabel={periodLabel}
        loading={globalInsightsLoading && !globalInsights}
        corridorLoading={corridorLoading && corridorVolume === 0}
        wallets={globalInsights?.totalActiveWallets}
        walletsTrend={walletsTrend}
        corridorVolume={corridorVolume}
        corridorTrend={corridorTrend}
        dollarization={corridorDollarShare}
        dollarizationTrendPp={dollarizationTrendPp}
        remittanceRatio={remittanceRatio}
        remittanceTrendPp={remittanceTrendPp}
        walletBreakdown={walletBreakdown}
        corridorBreakdown={corridorBreakdown}
        remittanceBreakdown={remittanceBreakdown}
        dollarizationBreakdown={dollarizationBreakdown}
        onSelectUsage={() => filters.setMapType('adoption')}
        formatCurrency={formatCurrency}
      />

      <div className="flex gap-3 items-center flex-wrap">
        <SegmentedControl
          layoutId="next-lens-pill"
          value={isUsage ? 'adoption' : 'regulation'}
          onChange={filters.setMapType}
          options={[
            { value: 'adoption', label: 'Usage view' },
            { value: 'regulation', label: 'Regulatory view' },
          ]}
        />
        <h1 className="display text-[1.35rem] sm:text-[1.55rem] text-[var(--ink-text)] min-w-0">
          {isUsage ? 'Where stablecoins are used' : 'Can you operate'}
        </h1>
        {isUsage && (
          <div className="ml-auto">
            <SegmentedControl
              layoutId="next-usage-geo"
              size="sm"
              value={geoMode}
              onChange={setGeoMode}
              options={[
                { value: 'country', label: 'Country' },
                { value: 'region', label: 'Region' },
              ]}
            />
          </div>
        )}
      </div>

      {isUsage && (
        <div className="space-y-6">
          <div className="relative">
            {usageLoading ? (
              <Skeleton className="w-full h-[200px] sm:h-[360px] rounded-xl" />
            ) : (
              <RealCorridorMap
                corridors={bidirectionalCorridors}
                regionalCorridors={regionalCorridors}
                countries={adoptionData}
                regionalAdoption={regionalData}
                mode={geoMode}
                getCountryName={(alpha2) => countryNameByAlpha2.get(alpha2) ?? alpha2}
                hideAntarctica
                countrySpokeHover
              />
            )}
            {(adoptionLoading || corridorLoading) && !usageLoading && (
              <div className="absolute inset-0 rounded-xl bg-white/40 dark:bg-neutral-950/40 pointer-events-none" />
            )}
          </div>

          <div className="surface p-5">
            <h4 className="display text-xl mb-3">
              {geoMode === 'region'
                ? `${regionalData.length} regions, ${directedRegionalCorridors.length} corridors`
                : `${adoptionTableData.length} countries, ${directedCorridors.length} corridors`}
            </h4>

            {geoMode === 'country' && adoptionTableData.length > 0 ? (
              <DataTable
                data={adoptionTableData}
                columns={adoptionColumns}
                defaultSortKey="gdpIntensity"
                defaultSortDirection="desc"
                pageSize={10}
                paginate={false}
                resetKey={`${filters.year}-${filters.month}-adoption`}
                isExpandable={(row) => (destsByOriginAlpha.get(row.isoAlpha2)?.length ?? 0) > 0}
                renderExpanded={(row) => {
                  const dests = destsByOriginAlpha.get(row.isoAlpha2) ?? [];
                  return (
                    <div className="space-y-0.5">
                      <p className="text-[11px] text-[var(--muted-ink)] px-1.5 pb-1">
                        {dests.length} outbound {dests.length === 1 ? 'corridor' : 'corridors'}
                      </p>
                      {dests.map((dest) => (
                        <NamedCorridorDestRow
                          key={`${row.isoAlpha2}-${dest.toAlpha}`}
                          name={countryNameByAlpha2.get(dest.toAlpha) ?? dest.toAlpha}
                          alpha={dest.toAlpha}
                          volume={dest.volume}
                          formatVolume={formatCurrency}
                          onClick={
                            alpha2ToNumeric.has(dest.toAlpha)
                              ? () => openCountry(dest.toAlpha)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  );
                }}
                onRowClick={(row) =>
                  navigate(countryPath({ countryId: row.countryId, name: row.name, isoAlpha2: row.isoAlpha2 }), {
                    state: { name: row.name, isoAlpha2: row.isoAlpha2 },
                  })
                }
              />
            ) : geoMode === 'region' && regionalData.length > 0 ? (
              <DataTable
                data={regionalData}
                columns={regionColumns}
                defaultSortKey="adoptionRate"
                defaultSortDirection="desc"
                pageSize={10}
                paginate={false}
                resetKey={`${filters.year}-${filters.month}-region`}
                isExpandable={(row) => (destsByOriginRegion.get(row.region)?.length ?? 0) > 0}
                renderExpanded={(row) => {
                  const dests = destsByOriginRegion.get(row.region) ?? [];
                  return (
                    <div className="space-y-0.5">
                      <p className="text-[11px] text-[var(--muted-ink)] px-1.5 pb-1">
                        {dests.length} outbound {dests.length === 1 ? 'corridor' : 'corridors'}
                      </p>
                      {dests.map((dest) => (
                        <NamedCorridorDestRow
                          key={`${row.region}-${dest.toRegion}`}
                          name={dest.toRegion}
                          volume={dest.volume}
                          formatVolume={formatCurrency}
                        />
                      ))}
                    </div>
                  );
                }}
              />
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </div>

          <div className="surface p-5">
            <h4 className="display text-xl mb-1">Token mix on these corridors</h4>
            <p className="text-sm text-[var(--muted-ink)] mb-4">
              Volume-weighted from corridor top coins. USDT vs USDC vs EURC is the usual rail split.
            </p>
            <TokenMixBar items={tokenMix} formatVolume={formatCurrency} />
          </div>
        </div>
      )}

      {filters.mapType === 'regulation' && (
        <div className="space-y-6">
          <div className="surface p-5">
            <h4 className="display text-xl mb-1">Usage × rules</h4>
            <p className="text-sm text-[var(--muted-ink)] mb-4">
              The question operators and policy teams actually ask. Click a country to open the briefing.
            </p>
            <UsageRegulationMatrix rows={usageRuleRows} />
          </div>
          <RegulationPanel paginate={false} hideAntarctica />
        </div>
      )}
    </div>
  );
}

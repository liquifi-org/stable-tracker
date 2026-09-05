import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { Plus, Minus, RotateCcw, ChevronDown } from 'lucide-react';
import { useMapZoomPan } from '../hooks/useMapZoomPan';
import { filterMapFeatures, MAP_VIEW_H, MAP_VIEW_W, worldMapProjection } from '../lib/worldMapProjection';
import { useFilters } from '../context/FilterContext';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';
import { CountryFlag } from './CountryFlag';
import type { CountryAdoptionMetric, RegionalAdoptionMetric } from '../services/api';
import { countryPath } from '../lib/countryRoutes';

type MapViewMode = 'country' | 'region';

interface StablecoinEntry {
  name: string;
  share: number;
}

interface BidirectionalCorridor {
  country1: string;
  country2: string;
  valueFromCountry1: number;
  valueFromCountry2: number;
  totalValue: number;
  dollarizationIndex: number;
  topStablecoinsFrom1?: StablecoinEntry[];
  topStablecoinsFrom2?: StablecoinEntry[];
}

interface BidirectionalRegionalCorridor {
  region1: string;
  region2: string;
  valueFromRegion1: number;
  valueFromRegion2: number;
  totalValue: number;
  dollarizationIndex: number;
}

interface RealCorridorMapProps {
  corridors: BidirectionalCorridor[];
  getCountryName: (code: string) => string;
  limit?: number;
  mode?: MapViewMode;
  regionalCorridors?: BidirectionalRegionalCorridor[];
  /** Mercator scale in the map viewBox. Default 140. Lower is more zoomed out. */
  projectionScale?: number;
  /** Drop Antarctica so Mercator doesn't draw a polar strip across the bottom. */
  hideAntarctica?: boolean;
  /** Hover a country/region marker to light its spokes and show volume chips. */
  countrySpokeHover?: boolean;
  /** When set, land is colored by adoption and hover also shows rank / wallets. */
  countries?: CountryAdoptionMetric[];
  regionalAdoption?: RegionalAdoptionMetric[];
}

/** Normalized shape both country- and region-mode corridors render against. */
interface DisplayCorridor {
  id1: string;
  id2: string;
  valueFrom1: number;
  valueFrom2: number;
  totalValue: number;
  dollarizationIndex: number;
  topStablecoinsFrom1?: StablecoinEntry[];
  topStablecoinsFrom2?: StablecoinEntry[];
}

const countryCentroids: Record<string, [number, number]> = {
  US: [-95, 38],   MX: [-102, 23],  BR: [-47, -14],  AR: [-64, -34],  VE: [-66, 8],
  GB: [-2, 54],    FR: [2, 47],     DE: [10, 51],    TR: [35, 39],    NG: [8, 9],
  KE: [38, 1],     IN: [78, 22],    CN: [105, 35],   JP: [138, 36],   PH: [122, 12],
  AU: [134, -25],  AT: [14.5, 47.5], TW: [121, 23.5], ID: [118, -2],  KR: [128, 36],
  NL: [5.3, 52.4], ZA: [25, -29],   UA: [32, 48.4],  IR: [53, 32],
};

/** world-atlas numeric ids → corridor alpha-2 used by centroids / flows. */
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  '840': 'US', '484': 'MX', '076': 'BR', '032': 'AR', '862': 'VE',
  '826': 'GB', '250': 'FR', '276': 'DE', '792': 'TR', '566': 'NG',
  '404': 'KE', '356': 'IN', '156': 'CN', '392': 'JP', '608': 'PH',
  '036': 'AU', '040': 'AT', '158': 'TW', '360': 'ID', '410': 'KR',
  '528': 'NL', '710': 'ZA', '804': 'UA', '364': 'IR',
};

function alpha2FromFeatureId(id: unknown): string | undefined {
  return NUMERIC_TO_ALPHA2[String(id).padStart(3, '0')];
}

const NO_DATA_COLOR = '#e2e8f0';
const ADOPTION_BUCKETS = [
  { min: 0.8, color: '#1a4fd6', label: 'Highest' },
  { min: 0.6, color: '#3f74e3', label: 'High' },
  { min: 0.4, color: '#6f9aed', label: 'Mid' },
  { min: 0.2, color: '#a3c2f5', label: 'Low' },
  { min: 0, color: '#d6e4fb', label: 'Lowest' },
];
const REGION_RANK_COLORS = ['#1a4fd6', '#6f9aed', '#d6e4fb'];

function adoptionFill(index: number): string {
  const t = Math.min(1, Math.max(0, index));
  return ADOPTION_BUCKETS.find((b) => t >= b.min)!.color;
}

function fmtWallets(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtPer100k(rate: number): string {
  const per100k = rate * 100_000;
  if (per100k >= 100) return per100k.toFixed(0);
  if (per100k >= 10) return per100k.toFixed(1);
  return per100k.toFixed(2);
}

function fmtPct(ratio: number): string {
  const pct = ratio * 100;
  if (pct < 0.01) return pct.toFixed(4) + '%';
  if (pct < 1) return pct.toFixed(2) + '%';
  return pct.toFixed(1) + '%';
}

function coinSummary(coins?: { name: string; share: number }[]): string {
  if (!coins?.length) return '—';
  return coins.slice(0, 3).map((s) => `${s.name} ${Math.round(s.share * 100)}%`).join(' · ');
}

/** Representative centroid per macro region, for the region-mode map. */
const regionCentroids: Record<string, [number, number]> = {
  Americas: [-80, 5],
  EMEIA: [20, 25],
  APAC: [110, 8],
};

function quadPoint(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  t: number,
): [number, number] {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}

export function RealCorridorMap({
  corridors,
  getCountryName,
  limit,
  mode = 'country',
  regionalCorridors = [],
  projectionScale = 140,
  hideAntarctica = false,
  countrySpokeHover = false,
  countries = [],
  regionalAdoption = [],
}: RealCorridorMapProps) {
  const { formatCurrency: formatValue } = useCurrencyFormat();
  const [worldData, setWorldData] = useState<any>(null);
  const [hoveredCorridor, setHoveredCorridor] = useState<number | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<number | null>(null);
  const [hoveredPlace, setHoveredPlace] = useState<string | null>(null);
  const [pinnedPlace, setPinnedPlace] = useState<string | null>(null);
  const [showCorridorDetails, setShowCorridorDetails] = useState(false);
  const [seenHover, setSeenHover] = useState(false);
  const {
    svgRef, viewBox, zoom, minZoom, maxZoom, zoomIn, zoomOut, resetView,
    isDragging, draggedRef, handleMouseDown, handleMouseMove: handlePanMove, endDrag,
  } = useMapZoomPan();
  const filters = useFilters();
  const navigate = useNavigate();
  const goToCountry = (ref: { name?: string; isoAlpha2?: string; countryId?: string }) => {
    navigate(countryPath(ref), {
      state: { name: ref.name, isoAlpha2: ref.isoAlpha2 },
    });
  };
  const tooltipHoveredRef = useRef(false);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);

  const scrollToInspector = () => {
    const el = inspectorRef.current;
    if (!el) return;
    const header = document.querySelector('.sticky.top-0');
    const headerH = header instanceof HTMLElement ? header.getBoundingClientRect().height : 0;
    const keepMap = Math.round((window.innerHeight - headerH) * 0.42);
    const top = window.scrollY + el.getBoundingClientRect().top - headerH - keepMap;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  const scheduleDismiss = () => {
    dismissTimeoutRef.current = setTimeout(() => {
      if (!tooltipHoveredRef.current) setHoveredCorridor(null);
    }, 80);
  };

  const enterPlace = (code: string) => {
    setSeenHover(true);
    if (pinnedPlace) return;
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    setHoveredPlace(code);
  };
  const leavePlace = () => {
    if (pinnedPlace) return;
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    dismissTimeoutRef.current = setTimeout(() => setHoveredPlace(null), 60);
  };
  const pinPlace = (code: string) => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    if (pinnedPlace === code) {
      closePlace();
      return;
    }
    setPinnedPlace(code);
    setHoveredPlace(code);
    setShowCorridorDetails(false);
  };
  const closePlace = () => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    setPinnedPlace(null);
    setHoveredPlace(null);
    setShowCorridorDetails(false);
  };

  const handleReset = () => {
    resetView();
  };

  const centroids = mode === 'region' ? regionCentroids : countryCentroids;
  const getLabel = mode === 'region' ? (id: string) => id : getCountryName;

  const allItems: DisplayCorridor[] = useMemo(() => {
    if (mode === 'region') {
      return [...regionalCorridors]
        .sort((a, b) => b.totalValue - a.totalValue)
        .map((r) => ({
          id1: r.region1,
          id2: r.region2,
          valueFrom1: r.valueFromRegion1,
          valueFrom2: r.valueFromRegion2,
          totalValue: r.totalValue,
          dollarizationIndex: r.dollarizationIndex,
        }));
    }
    return [...corridors]
      .sort((a, b) => b.totalValue - a.totalValue)
      .map((c) => ({
        id1: c.country1,
        id2: c.country2,
        valueFrom1: c.valueFromCountry1,
        valueFrom2: c.valueFromCountry2,
        totalValue: c.totalValue,
        dollarizationIndex: c.dollarizationIndex,
        topStablecoinsFrom1: c.topStablecoinsFrom1,
        topStablecoinsFrom2: c.topStablecoinsFrom2,
      }));
  }, [mode, corridors, regionalCorridors]);

  const displayItems = limit !== undefined ? allItems.slice(0, limit) : allItems;

  const spokeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of allItems) {
      ids.add(c.id1);
      ids.add(c.id2);
    }
    return ids;
  }, [allItems]);
  const drawnEndpointIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of displayItems) {
      ids.add(c.id1);
      ids.add(c.id2);
    }
    return ids;
  }, [displayItems]);

  const showAdoption = countries.length > 0;
  const adoptionById = useMemo(() => {
    const m = new Map<string, CountryAdoptionMetric>();
    for (const c of countries) {
      m.set(c.countryId, c);
      m.set(c.countryId.padStart(3, '0'), c);
      const n = Number(c.countryId);
      if (!Number.isNaN(n)) m.set(String(n), c);
    }
    return m;
  }, [countries]);
  const adoptionByAlpha2 = useMemo(
    () => new Map(countries.map((c) => [c.isoAlpha2, c])),
    [countries],
  );
  const rankedRegions = useMemo(
    () => [...regionalAdoption].sort((a, b) => b.adoptionRate - a.adoptionRate).slice(0, 3),
    [regionalAdoption],
  );
  const regionColorMap = useMemo(() => {
    const m = new Map<string, string>();
    rankedRegions.forEach((r, i) => m.set(r.region, REGION_RANK_COLORS[i] ?? NO_DATA_COLOR));
    return m;
  }, [rankedRegions]);
  const regionalByName = useMemo(
    () => new Map(regionalAdoption.map((r) => [r.region, r])),
    [regionalAdoption],
  );

  const lookupAdoption = (id: unknown): CountryAdoptionMetric | undefined => {
    const raw = String(id);
    return adoptionById.get(raw)
      ?? adoptionById.get(raw.padStart(3, '0'))
      ?? adoptionById.get(String(Number(raw)));
  };

  const activePlace = pinnedPlace ?? hoveredPlace;
  const pinned = pinnedPlace != null;
  const hoveredMetric = mode === 'country' && activePlace ? adoptionByAlpha2.get(activePlace) : undefined;
  const hoveredRegion = mode === 'region' && activePlace ? regionalByName.get(activePlace) : undefined;
  const activeCorridors = useMemo(() => {
    if (!activePlace) return [];
    return allItems
      .filter((c) => c.id1 === activePlace || c.id2 === activePlace)
      .map((c) => {
        const is1 = c.id1 === activePlace;
        return {
          partner: is1 ? c.id2 : c.id1,
          outbound: is1 ? c.valueFrom1 : c.valueFrom2,
          inbound: is1 ? c.valueFrom2 : c.valueFrom1,
          totalValue: c.totalValue,
          dollarizationIndex: c.dollarizationIndex,
          outboundCoins: is1 ? c.topStablecoinsFrom1 : c.topStablecoinsFrom2,
          inboundCoins: is1 ? c.topStablecoinsFrom2 : c.topStablecoinsFrom1,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [allItems, activePlace]);
  const hoveredSpokeCount = activeCorridors.length;
  const drawnSpokeCount = useMemo(() => {
    if (!activePlace) return 0;
    return displayItems.filter((c) => c.id1 === activePlace || c.id2 === activePlace).length;
  }, [displayItems, activePlace]);
  const corridorCaption = (() => {
    if (hoveredSpokeCount === 0) return 'No international corridors';
    const n = `${hoveredSpokeCount} international corridor${hoveredSpokeCount === 1 ? '' : 's'}`;
    if (drawnSpokeCount === 0 && limit != null) {
      return `${n} · not in the ${limit} largest`;
    }
    return n;
  })();
  const corridorTotals = useMemo(() => {
    const outbound = activeCorridors.reduce((s, c) => s + c.outbound, 0);
    const inbound = activeCorridors.reduce((s, c) => s + c.inbound, 0);
    const total = outbound + inbound;
    const usd = activeCorridors.reduce((s, c) => s + c.totalValue * c.dollarizationIndex, 0);
    return { outbound, inbound, total, usdShare: total > 0 ? usd / total : null };
  }, [activeCorridors]);

  const maxVolume = displayItems[0]?.totalValue ?? 1;
  const minVolume = displayItems[displayItems.length - 1]?.totalValue ?? 0;
  const volumeRange = Math.max(maxVolume - minVolume, 1);

  // Stroke width: 1.5px (lowest) → 5px (highest), relative to the visible set
  function lineWidth(value: number): number {
    return 1.5 + ((value - minVolume) / volumeRange) * 3.5;
  }

  // Warm / silver ramp so arcs read against the blue adoption fill.
  function lineColor(value: number): string {
    const ratio = (value - minVolume) / volumeRange;
    if (ratio >= 0.8) return '#f5c14a';
    if (ratio >= 0.6) return '#e8a63a';
    if (ratio >= 0.4) return '#d4b07a';
    if (ratio >= 0.2) return '#c5c6c2';
    return '#a8b3c4';
  }

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(res => res.json())
      .then(data => setWorldData(data))
      .catch(err => console.error('Error loading world map:', err));
  }, []);

  useEffect(() => {
    if (selectedCorridor !== null && selectedCorridor >= displayItems.length) {
      setSelectedCorridor(null);
    }
  }, [displayItems, selectedCorridor]);

  useEffect(() => {
    setPinnedPlace(null);
    setShowCorridorDetails(false);
  }, [filters.year, filters.month, filters.stablecoin, filters.regionFrom, filters.regionTo, mode]);

  useEffect(() => {
    if (!pinnedPlace) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePlace();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinnedPlace]);

  if (!worldData) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-8 flex items-center justify-center h-[200px] sm:h-[340px]">
        <div className="text-slate-400">Loading world map...</div>
      </div>
    );
  }

  const geojson = feature(worldData, worldData.objects.countries) as GeoJSON.FeatureCollection;
  const features = filterMapFeatures(geojson.features, hideAntarctica);
  const projection = worldMapProjection(
    { type: 'FeatureCollection', features },
    { scale: projectionScale, hideAntarctica },
  );
  const pathGenerator = geoPath().projection(projection);

  const handleCorridorHover = (_e: React.MouseEvent, index: number) => {
    if (isDragging) return;
    setHoveredCorridor(index);
  };

  const handleCorridorClick = (index: number) => {
    if (draggedRef.current) return;
    setSelectedCorridor(index);
  };

  const hoveredData = hoveredCorridor !== null ? displayItems[hoveredCorridor] : null;
  const selectedData = selectedCorridor !== null ? displayItems[selectedCorridor] : null;

  const legendItems = [
    { label: 'Low', width: 1.5, color: '#a8b3c4' },
    { label: 'Mid', width: 2.5, color: '#d4b07a' },
    { label: 'High', width: 3.5, color: '#e8a63a' },
    { label: 'Peak', width: 5, color: '#f5c14a' },
  ];

  return (
    <div className="relative space-y-3">
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/50 dark:border-neutral-700 overflow-hidden transition-ui">
        <div className="relative px-5 py-3 bg-[#F7FAFC] dark:bg-neutral-900">
          {countrySpokeHover && !seenHover && !activePlace && (
            <div className="absolute top-4 left-4 z-20 pointer-events-none text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Hover a country — click to select
            </div>
          )}
          {countrySpokeHover && !pinned && activePlace && (
            <div className="absolute top-4 left-4 z-20 pointer-events-none max-w-[min(94%,22rem)]">
              <div className="rounded-lg bg-neutral-950/90 dark:bg-neutral-950/92 border border-white/15 px-3 py-2 text-xs text-white">
                <div className="flex items-center gap-2 min-w-0">
                  {mode === 'country' && (
                    <CountryFlag isoAlpha2={hoveredMetric?.isoAlpha2 ?? activePlace} className="w-4 h-4 shrink-0" />
                  )}
                  <span className="font-semibold truncate">
                    {mode === 'country' ? (hoveredMetric?.name ?? getLabel(activePlace)) : activePlace}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-white/70 tabular-nums">
                  {mode === 'country' && hoveredMetric?.relativeAdoptionIndex != null && (
                    <span>
                      #{hoveredMetric.adoptionRank} · {fmtPer100k(hoveredMetric.adoptionRate)} / 100k
                    </span>
                  )}
                  {mode === 'country' && hoveredMetric && hoveredMetric.relativeAdoptionIndex == null && hoveredMetric.activeWallets > 0 && (
                    <span>{fmtWallets(hoveredMetric.activeWallets)} wallets · not ranked</span>
                  )}
                  {mode === 'region' && hoveredRegion && (
                    <span>{fmtWallets(hoveredRegion.activeWallets)} wallets</span>
                  )}
                  <span>{corridorCaption}</span>
                </div>
              </div>
            </div>
          )}
          {/* Legend — bottom-left, opposite zoom controls */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-slate-200/60 dark:border-neutral-700 rounded-lg p-2.5 shadow-md space-y-2.5 max-w-[13.5rem]">
            {showAdoption && (
              <div>
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  {mode === 'region' ? 'Adoption by region' : 'Adoption index'}
                </div>
                <div className="space-y-1">
                  {mode === 'region' ? (
                    rankedRegions.map((r, i) => (
                      <div key={r.region} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm shrink-0 border border-slate-200 dark:border-neutral-600" style={{ backgroundColor: REGION_RANK_COLORS[i] ?? NO_DATA_COLOR }} />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300">{r.region}</span>
                      </div>
                    ))
                  ) : (
                    ADOPTION_BUCKETS.map((bucket) => (
                      <div key={bucket.label} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm shrink-0 border border-slate-200 dark:border-neutral-600" style={{ backgroundColor: bucket.color }} />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300">{bucket.label}</span>
                      </div>
                    ))
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm shrink-0 border border-slate-200 dark:border-neutral-600" style={{ backgroundColor: NO_DATA_COLOR }} />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">
                      {mode === 'region' ? 'No data' : '<10k wallets'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Volume</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{formatValue(minVolume)}</span>
                {legendItems.map((item, idx) => (
                  <svg key={idx} width="22" height="10" className="shrink-0">
                    <line x1="0" y1="5" x2="22" y2="5" stroke={item.color} strokeWidth={item.width} strokeLinecap="round" />
                  </svg>
                ))}
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{formatValue(maxVolume)}</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= maxZoom}
              aria-label="Zoom in"
              className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-ui"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= minZoom}
              aria-label="Zoom out"
              className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-ui"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={zoom <= minZoom}
              aria-label="Reset map view"
              title="Reset map view"
              className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-ui"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className={`w-full aspect-[8/3] ${zoom > minZoom ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handlePanMove}
            onMouseUp={endDrag}
            onMouseLeave={() => {
              endDrag();
              if (countrySpokeHover && !pinnedPlace) {
                if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
                setHoveredPlace(null);
              }
            }}
          >
            <defs>
              <filter id="corridor-glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <rect
              width={MAP_VIEW_W}
              height={MAP_VIEW_H}
              className="fill-[#F7FAFC] dark:fill-neutral-900"
              onClick={() => {
                if (draggedRef.current) return;
                closePlace();
              }}
            />

            {features.map((geo: any, i: number) => {
              const pathData = pathGenerator(geo as any);
              if (!pathData) return null;
              const metric = showAdoption ? lookupAdoption(geo.id) : undefined;
              const alpha2 = metric?.isoAlpha2 ?? (mode === 'country' ? alpha2FromFeatureId(geo.id) : undefined);
              const regionKey = metric?.macroRegion ?? undefined;
              const hoverKey = mode === 'region' ? regionKey : alpha2;
              const hasSpokes = hoverKey != null && spokeIds.has(hoverKey);
              const interactive = Boolean(
                countrySpokeHover &&
                  hoverKey &&
                  (showAdoption ? (mode === 'country' ? metric || hasSpokes : regionKey) : hasSpokes),
              );
              const isFocus = Boolean(interactive && activePlace && activePlace === hoverKey);

              let fill = '#e2e8f0';
              let stroke = '#cbd5e1';
              let strokeWidth = 0.5;
              let opacity = 0.6;

              if (showAdoption) {
                fill = NO_DATA_COLOR;
                stroke = '#cbd5e1';
                strokeWidth = 0.5;
                opacity = 0.8;
                if (mode === 'region') {
                  const rc = regionKey ? regionColorMap.get(regionKey) : undefined;
                  if (rc) {
                    fill = rc;
                    opacity = 0.9;
                    stroke = '#64748b';
                    strokeWidth = 1;
                  }
                } else if (metric?.relativeAdoptionIndex != null) {
                  fill = adoptionFill(metric.relativeAdoptionIndex);
                  opacity = 0.9;
                  stroke = '#64748b';
                  strokeWidth = 1;
                }
                if (isFocus) {
                  stroke = 'var(--brand-400)';
                  strokeWidth = 2;
                  opacity = 1;
                }
              }

              return (
                <path
                  key={i}
                  d={pathData}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  className={interactive ? 'cursor-pointer transition-[fill,opacity,stroke] duration-150' : 'pointer-events-none'}
                  onMouseEnter={interactive && hoverKey ? () => enterPlace(hoverKey) : undefined}
                  onMouseLeave={interactive ? leavePlace : undefined}
                  onClick={
                    interactive && hoverKey
                      ? () => {
                          if (draggedRef.current) return;
                          pinPlace(hoverKey);
                        }
                      : undefined
                  }
                />
              );
            })}

            {displayItems.map((corridor, index) => {
              const fromCoords = centroids[corridor.id1];
              const toCoords = centroids[corridor.id2];
              if (!fromCoords || !toCoords) return null;

              const fromPoint = projection(fromCoords);
              const toPoint = projection(toCoords);
              if (!fromPoint || !toPoint) return null;

              const dx = toPoint[0] - fromPoint[0];
              const dy = toPoint[1] - fromPoint[1];
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < 1) return null;
              const offset = distance * 0.15;
              const midX = (fromPoint[0] + toPoint[0]) / 2;
              const midY = (fromPoint[1] + toPoint[1]) / 2;
              const perpX = -dy / distance;
              const perpY = dx / distance;
              const controlX = midX + perpX * offset;
              const controlY = midY + perpY * offset;
              const path = `M ${fromPoint[0]} ${fromPoint[1]} Q ${controlX} ${controlY} ${toPoint[0]} ${toPoint[1]}`;

              const onSpoke =
                countrySpokeHover &&
                activePlace != null &&
                (corridor.id1 === activePlace || corridor.id2 === activePlace);
              const isHovered = !countrySpokeHover && hoveredCorridor === index;
              const isSelected = !countrySpokeHover && selectedCorridor === index;
              const lit = isHovered || isSelected || onSpoke;
              const sw = lineWidth(corridor.totalValue);
              const color = lineColor(corridor.totalValue);

              return (
                <path
                  key={`${corridor.id1}-${corridor.id2}-${index}`}
                  d={path}
                  pathLength={1}
                  stroke={lit ? '#ffe08a' : color}
                  strokeWidth={lit ? sw + 1.25 : sw}
                  fill="none"
                  opacity={lit ? 1 : 0.45}
                  onMouseEnter={countrySpokeHover ? undefined : (e) => handleCorridorHover(e, index)}
                  onMouseLeave={countrySpokeHover ? undefined : scheduleDismiss}
                  onClick={countrySpokeHover ? undefined : () => handleCorridorClick(index)}
                  className={`${countrySpokeHover ? 'pointer-events-none' : 'cursor-pointer'} animate-map-draw transition-[stroke-width,opacity] duration-150`}
                  filter={lit ? 'url(#corridor-glow)' : undefined}
                  strokeLinecap="round"
                  style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
                />
              );
            })}

            {Object.entries(centroids).map(([code, coords]) => {
              const point = projection(coords);
              if (!point) return null;
              const isFocus = countrySpokeHover && activePlace === code;
              const hasSpokes = spokeIds.has(code);

              if (mode === 'region') {
                return (
                  <g
                    key={code}
                    onMouseEnter={countrySpokeHover && hasSpokes ? () => enterPlace(code) : undefined}
                    onMouseLeave={countrySpokeHover ? leavePlace : undefined}
                    onClick={
                      countrySpokeHover && hasSpokes
                        ? () => {
                            if (draggedRef.current) return;
                            pinPlace(code);
                          }
                        : undefined
                    }
                    className={countrySpokeHover && hasSpokes ? 'cursor-pointer' : undefined}
                  >
                    {countrySpokeHover && hasSpokes && (
                      <circle cx={point[0]} cy={point[1]} r={26} fill="transparent" />
                    )}
                    <circle
                      cx={point[0]}
                      cy={point[1]}
                      r={18}
                      fill="var(--brand)"
                      stroke={isFocus ? '#fff' : '#475569'}
                      strokeWidth={isFocus ? 2.5 : 1.5}
                    />
                    <text
                      x={point[0]}
                      y={point[1] + 3}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill="white"
                      className="pointer-events-none"
                    >
                      {code}
                    </text>
                  </g>
                );
              }

              if (!drawnEndpointIds.has(code)) return null;

              return (
                <circle
                  key={code}
                  cx={point[0]}
                  cy={point[1]}
                  r={isFocus ? 4.5 : 3}
                  fill={isFocus ? '#ffe08a' : '#f5d090'}
                  stroke={isFocus ? '#fff' : 'rgba(15,23,42,0.7)'}
                  strokeWidth={isFocus ? 1.25 : 0.75}
                  className="pointer-events-none"
                />
              );
            })}

            {countrySpokeHover && pinned && activePlace && displayItems
              .filter((corridor) => corridor.id1 === activePlace || corridor.id2 === activePlace)
              .sort((a, b) => b.totalValue - a.totalValue)
              .slice(0, 5)
              .map((corridor, index) => {
              const fromCoords = centroids[corridor.id1];
              const toCoords = centroids[corridor.id2];
              if (!fromCoords || !toCoords) return null;
              const fromPoint = projection(fromCoords);
              const toPoint = projection(toCoords);
              if (!fromPoint || !toPoint) return null;
              const dx = toPoint[0] - fromPoint[0];
              const dy = toPoint[1] - fromPoint[1];
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < 1) return null;
              const offset = distance * 0.15;
              const control: [number, number] = [
                (fromPoint[0] + toPoint[0]) / 2 + (-dy / distance) * offset,
                (fromPoint[1] + toPoint[1]) / 2 + (dx / distance) * offset,
              ];
              const origin = corridor.id1 === activePlace ? fromPoint : toPoint;
              const dest = corridor.id1 === activePlace ? toPoint : fromPoint;
              const [cx, cy] = quadPoint(origin as [number, number], control, dest as [number, number], 0.55);
              const partner = corridor.id1 === activePlace ? corridor.id2 : corridor.id1;
              const label = `${partner}  ${formatValue(corridor.totalValue)}`;
              const cardW = Math.min(108, 36 + label.length * 4.1);
              return (
                <g key={`card-${corridor.id1}-${corridor.id2}-${index}`} className="pointer-events-none">
                  <rect
                    x={cx - cardW / 2}
                    y={cy - 9}
                    width={cardW}
                    height={18}
                    rx={5}
                    className="fill-[var(--ink)]"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={0.75}
                  />
                  <text
                    x={cx}
                    y={cy + 3.5}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="600"
                    fill="white"
                    className="tabular-nums"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
          {countrySpokeHover && pinned && (
            <button
              type="button"
              onClick={scrollToInspector}
              className="flex w-full flex-col items-center gap-0.5 pt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              See details
              <ChevronDown className="w-3.5 h-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {countrySpokeHover && pinned && activePlace && (
        <div
          ref={inspectorRef}
          className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/50 dark:border-neutral-700 overflow-hidden"
        >
          <div className="bg-[var(--brand)]/10 dark:bg-[var(--brand)]/15 px-4 py-2 border-b border-slate-200 dark:border-neutral-700">
            <h3 className="font-bold text-[var(--brand-700)] dark:text-[var(--brand-300)] text-lg flex items-center gap-2">
              {mode === 'country' && (
                <CountryFlag isoAlpha2={hoveredMetric?.isoAlpha2 ?? activePlace} className="w-5 h-5" />
              )}
              {mode === 'country' ? (hoveredMetric?.name ?? getLabel(activePlace)) : activePlace}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {[
                mode === 'country' ? hoveredMetric?.region : `${hoveredRegion?.countryCount ?? '—'} countries`,
                corridorCaption,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-neutral-700">
            <div className="px-4 py-3 space-y-4">
              <div>
                <div className="text-xs font-semibold text-[var(--brand-700)] dark:text-[var(--brand-300)] italic mb-2">Economic integration</div>
                <div className="space-y-2 text-xs">
                  {mode === 'country' && hoveredMetric ? (
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Stablecoin TX value share</span>
                      <span className="text-slate-800 dark:text-slate-100 font-bold text-base tabular-nums">{fmtPct(hoveredMetric.txValueShare)}</span>
                    </div>
                  ) : hoveredRegion ? (
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Stablecoin TX value share</span>
                      <span className="text-slate-800 dark:text-slate-100 font-bold text-base tabular-nums">{fmtPct(hoveredRegion.txValueShare)}</span>
                    </div>
                  ) : null}
                  {hoveredSpokeCount > 0 && (
                    <>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Outbound corridor volume</span>
                        <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{formatValue(corridorTotals.outbound)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Inbound corridor volume</span>
                        <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{formatValue(corridorTotals.inbound)}</span>
                      </div>
                      {corridorTotals.usdShare != null && (
                        <div className="flex justify-between items-center gap-3">
                          <span className="text-slate-500 dark:text-slate-400">USD-referenced share</span>
                          <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{fmtPct(corridorTotals.usdShare)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {mode === 'country' && hoveredMetric?.relativeAdoptionIndex != null && (
                    <>
                      <div className="flex justify-between items-center gap-3 pt-1">
                        <span className="text-slate-500 dark:text-slate-400">Adoption index (rank)</span>
                        <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">
                          #{hoveredMetric.adoptionRank}
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-normal"> of {hoveredMetric.eligibleCountries}</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Wallets per 100k</span>
                        <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{fmtPer100k(hoveredMetric.adoptionRate)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Wallets holding stablecoins</span>
                        <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{fmtWallets(hoveredMetric.activeWallets)}</span>
                      </div>
                    </>
                  )}
                  {mode === 'region' && hoveredRegion && (
                    <>
                      <div className="flex justify-between items-center gap-3 pt-1">
                        <span className="text-slate-500 dark:text-slate-400">Adoption rate</span>
                        <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{fmtPct(hoveredRegion.adoptionRate)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Wallets holding stablecoins</span>
                        <span className="text-slate-800 dark:text-slate-100 font-semibold tabular-nums">{fmtWallets(hoveredRegion.activeWallets)}</span>
                      </div>
                    </>
                  )}
                  {mode === 'country' && hoveredMetric && hoveredMetric.relativeAdoptionIndex == null && hoveredMetric.activeWallets > 0 && (
                    <p className="text-slate-500 dark:text-slate-400 italic">
                      Not enough wallets to rank ({fmtWallets(hoveredMetric.activeWallets)} — needs &gt;10k)
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="text-xs font-semibold text-[var(--brand-700)] dark:text-[var(--brand-300)] italic mb-2">Corridors</div>
              {activeCorridors.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">No international corridors</p>
              ) : (
                <div className="max-h-56 overflow-y-auto pr-1">
                  {drawnSpokeCount === 0 && limit != null && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 pb-1.5">
                      Not in the {limit} largest corridors drawn on the map
                    </p>
                  )}
                  {activeCorridors.map((row) => (
                    <div
                      key={row.partner}
                      className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-neutral-700/80 last:border-b-0"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {mode === 'country' && <CountryFlag isoAlpha2={row.partner} className="w-4 h-3 rounded-sm shrink-0" />}
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{getLabel(row.partner)}</span>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{formatValue(row.totalValue)}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          → {formatValue(row.outbound)} · ← {formatValue(row.inbound)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showCorridorDetails && activeCorridors.length > 0 && (
            <div className="border-t border-slate-200 dark:border-neutral-700 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-neutral-700 bg-slate-50/80 dark:bg-neutral-900/60 text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2 text-left font-medium">Partner</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="px-3 py-2 text-right font-medium">Outbound</th>
                    <th className="px-3 py-2 text-right font-medium">Inbound</th>
                    <th className="px-3 py-2 text-right font-medium">USD share</th>
                    <th className="px-3 py-2 text-left font-medium">Outbound coins</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCorridors.map((row) => (
                    <tr key={`detail-${row.partner}`} className="border-b border-slate-100 dark:border-neutral-700/80 last:border-b-0">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-medium">
                          {mode === 'country' && <CountryFlag isoAlpha2={row.partner} className="w-4 h-3 rounded-sm" />}
                          {getLabel(row.partner)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-100">{formatValue(row.totalValue)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatValue(row.outbound)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatValue(row.inbound)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{fmtPct(row.dollarizationIndex)}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{coinSummary(row.outboundCoins)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-2 border-t border-slate-200 dark:border-neutral-700 flex items-center gap-2 flex-wrap justify-end">
            {mode === 'country' && (
              <button
                type="button"
                onClick={() => {
                  goToCountry({
                    countryId: hoveredMetric?.countryId ?? activePlace,
                    name: hoveredMetric?.name ?? getLabel(activePlace),
                    isoAlpha2: hoveredMetric?.isoAlpha2 ?? activePlace,
                  });
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-[var(--brand)] hover:bg-[var(--brand-700)] transition-colors"
              >
                Details
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCorridorDetails((v) => !v)}
              disabled={activeCorridors.length === 0}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                showCorridorDetails
                  ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand)]/10'
                  : 'border-slate-300 dark:border-neutral-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700'
              }`}
            >
              Corridor details
            </button>
            <button
              type="button"
              onClick={closePlace}
              className="px-3 py-1.5 text-xs font-semibold rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {hoveredData && !countrySpokeHover && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-4 z-20 w-[min(94%,36rem)] bg-white/97 dark:bg-neutral-800/97 backdrop-blur-md border border-[var(--brand)]/25 dark:border-[var(--brand)]/35 rounded-xl transition-ui overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
          onMouseEnter={() => {
            tooltipHoveredRef.current = true;
            if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
          }}
          onMouseLeave={() => {
            tooltipHoveredRef.current = false;
            setHoveredCorridor(null);
          }}
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-neutral-700 bg-[var(--brand)]/8 dark:bg-[var(--brand)]/12">
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              {mode === 'country' && <CountryFlag isoAlpha2={hoveredData.id1} className="w-5 h-4 rounded-sm" />}
              <span>{getLabel(hoveredData.id1)}</span>
              <span className="text-[var(--brand)] dark:text-[var(--brand-300)] font-normal">⟷</span>
              {mode === 'country' && <CountryFlag isoAlpha2={hoveredData.id2} className="w-5 h-4 rounded-sm" />}
              <span>{getLabel(hoveredData.id2)}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-neutral-700 bg-slate-50/80 dark:bg-neutral-900/60">
                  <th className="px-3 py-2 text-left text-slate-400 dark:text-slate-500 font-medium w-24"></th>
                  {/* Bidirectional total column */}
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-neutral-700 bg-[var(--brand)]/5 dark:bg-[var(--brand)]/8">
                    <span className="text-[var(--brand)] dark:text-[var(--brand-300)]">⟷</span> Total
                  </th>
                  {/* A → B column */}
                  <th className="px-3 py-2 text-center font-semibold border-l border-slate-200 dark:border-neutral-700">
                    {mode === 'country' ? (
                      <button
                        onClick={() => navigate(countryPath({ isoAlpha2: hoveredData.id1, name: getLabel(hoveredData.id1) }), { state: { name: getLabel(hoveredData.id1), isoAlpha2: hoveredData.id1 } })}
                        className="inline-flex items-center gap-1 text-[var(--brand)] dark:text-[var(--brand-300)] hover:underline cursor-pointer"
                        title={`View ${getLabel(hoveredData.id1)} country page`}
                      >
                        <CountryFlag isoAlpha2={hoveredData.id1} className="w-4 h-3 rounded-sm" />
                        {getLabel(hoveredData.id1)}
                      </button>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300">{getLabel(hoveredData.id1)}</span>
                    )}
                    <span className="text-slate-400 dark:text-slate-500 font-normal mx-1">→</span>
                    {mode === 'country' ? (
                      <button
                        onClick={() => navigate(countryPath({ isoAlpha2: hoveredData.id2, name: getLabel(hoveredData.id2) }), { state: { name: getLabel(hoveredData.id2), isoAlpha2: hoveredData.id2 } })}
                        className="inline-flex items-center gap-1 text-[var(--brand)] dark:text-[var(--brand-300)] hover:underline cursor-pointer"
                        title={`View ${getLabel(hoveredData.id2)} country page`}
                      >
                        <CountryFlag isoAlpha2={hoveredData.id2} className="w-4 h-3 rounded-sm" />
                        {getLabel(hoveredData.id2)}
                      </button>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300">{getLabel(hoveredData.id2)}</span>
                    )}
                  </th>
                  {/* B → A column */}
                  <th className="px-3 py-2 text-center font-semibold border-l border-slate-200 dark:border-neutral-700">
                    {mode === 'country' ? (
                      <button
                        onClick={() => navigate(countryPath({ isoAlpha2: hoveredData.id2, name: getLabel(hoveredData.id2) }), { state: { name: getLabel(hoveredData.id2), isoAlpha2: hoveredData.id2 } })}
                        className="inline-flex items-center gap-1 text-[var(--brand)] dark:text-[var(--brand-300)] hover:underline cursor-pointer"
                        title={`View ${getLabel(hoveredData.id2)} country page`}
                      >
                        <CountryFlag isoAlpha2={hoveredData.id2} className="w-4 h-3 rounded-sm" />
                        {getLabel(hoveredData.id2)}
                      </button>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300">{getLabel(hoveredData.id2)}</span>
                    )}
                    <span className="text-slate-400 dark:text-slate-500 font-normal mx-1">→</span>
                    {mode === 'country' ? (
                      <button
                        onClick={() => navigate(countryPath({ isoAlpha2: hoveredData.id1, name: getLabel(hoveredData.id1) }), { state: { name: getLabel(hoveredData.id1), isoAlpha2: hoveredData.id1 } })}
                        className="inline-flex items-center gap-1 text-[var(--brand)] dark:text-[var(--brand-300)] hover:underline cursor-pointer"
                        title={`View ${getLabel(hoveredData.id1)} country page`}
                      >
                        <CountryFlag isoAlpha2={hoveredData.id1} className="w-4 h-3 rounded-sm" />
                        {getLabel(hoveredData.id1)}
                      </button>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300">{getLabel(hoveredData.id1)}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Volume row */}
                <tr className={mode === 'country' ? 'border-b border-slate-200 dark:border-neutral-700' : ''}>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 font-medium">Volume</td>
                  <td className="px-3 py-2.5 text-center font-bold text-slate-800 dark:text-slate-100 border-l border-slate-200 dark:border-neutral-700 bg-[var(--brand)]/5 dark:bg-[var(--brand)]/8">
                    {formatValue(hoveredData.totalValue)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-neutral-700">
                    {formatValue(hoveredData.valueFrom1)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-neutral-700">
                    {formatValue(hoveredData.valueFrom2)}
                  </td>
                </tr>
                {/* Stablecoin mix row (country mode only) */}
                {mode === 'country' && (
                  <tr>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 font-medium align-top">Top coins</td>
                    <td className="px-3 py-2.5 border-l border-slate-200 dark:border-neutral-700 bg-[var(--brand)]/5 dark:bg-[var(--brand)]/8 align-top">
                      {(() => {
                        const coins = new Map<string, number>();
                        for (const s of hoveredData.topStablecoinsFrom1 ?? []) {
                          coins.set(s.name, (coins.get(s.name) ?? 0) + s.share * hoveredData.valueFrom1);
                        }
                        for (const s of hoveredData.topStablecoinsFrom2 ?? []) {
                          coins.set(s.name, (coins.get(s.name) ?? 0) + s.share * hoveredData.valueFrom2);
                        }
                        const denom = hoveredData.totalValue || 1;
                        const sorted = [...coins.entries()]
                          .map(([name, abs]) => ({ name, share: abs / denom }))
                          .sort((a, b) => b.share - a.share);
                        if (!sorted.length) return <span className="text-slate-400 dark:text-slate-500">—</span>;
                        return sorted.map(({ name, share }) => (
                          <div key={name} className="flex justify-between gap-3">
                            <span className="text-slate-500 dark:text-slate-400">{name}</span>
                            <span className="text-slate-700 dark:text-slate-200 font-semibold tabular-nums">{Math.round(share * 100)}%</span>
                          </div>
                        ));
                      })()}
                    </td>
                    <td className="px-3 py-2.5 border-l border-slate-200 dark:border-neutral-700 align-top">
                      {(hoveredData.topStablecoinsFrom1 ?? []).map(s => (
                        <div key={s.name} className="flex justify-between gap-3">
                          <span className="text-slate-500 dark:text-slate-400">{s.name}</span>
                          <span className="text-slate-700 dark:text-slate-200 font-semibold tabular-nums">{Math.round(s.share * 100)}%</span>
                        </div>
                      ))}
                      {!hoveredData.topStablecoinsFrom1?.length && <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </td>
                    <td className="px-3 py-2.5 border-l border-slate-200 dark:border-neutral-700 align-top">
                      {(hoveredData.topStablecoinsFrom2 ?? []).map(s => (
                        <div key={s.name} className="flex justify-between gap-3">
                          <span className="text-slate-500 dark:text-slate-400">{s.name}</span>
                          <span className="text-slate-700 dark:text-slate-200 font-semibold tabular-nums">{Math.round(s.share * 100)}%</span>
                        </div>
                      ))}
                      {!hoveredData.topStablecoinsFrom2?.length && <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {mode === 'country' && (
            <div className="px-4 py-2 border-t border-slate-200 dark:border-neutral-700 flex items-center text-xs text-slate-400 dark:text-slate-500">
              <span className="ml-auto italic">Click a country to view details</span>
            </div>
          )}
        </div>
      )}

      {selectedData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setSelectedCorridor(null)}>
          <div className="bg-white dark:bg-neutral-800 border border-[var(--brand)]/30 rounded-xl p-8 max-w-lg w-full mx-4 shadow-lg transition-all" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Corridor Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-[var(--brand-50)] dark:bg-slate-800 rounded-lg">
                <span className="text-gray-600 dark:text-slate-300">Route</span>
                <span className="text-gray-900 dark:text-white font-bold">{getLabel(selectedData.id1)} ⟷ {getLabel(selectedData.id2)}</span>
              </div>
              <div className="border-t border-[var(--brand)]/20 pt-4 space-y-3">
                <div className="flex justify-between items-center p-3 bg-[var(--brand-50)] dark:bg-slate-800/50 rounded-lg">
                  <span className="text-gray-600 dark:text-slate-300">Total corridor value (bidirectional)</span>
                  <span className="text-[var(--brand)] dark:text-[var(--brand-300)] font-bold text-xl">{formatValue(selectedData.totalValue)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col p-3 bg-gray-50 dark:bg-slate-800/30 rounded">
                    <span className="text-xs text-gray-500 dark:text-slate-400">{getLabel(selectedData.id1)} → {getLabel(selectedData.id2)}</span>
                    <span className="text-gray-900 dark:text-white font-semibold mt-1">{formatValue(selectedData.valueFrom1)}</span>
                  </div>
                  <div className="flex flex-col p-3 bg-gray-50 dark:bg-slate-800/30 rounded">
                    <span className="text-xs text-gray-500 dark:text-slate-400">{getLabel(selectedData.id2)} → {getLabel(selectedData.id1)}</span>
                    <span className="text-gray-900 dark:text-white font-semibold mt-1">{formatValue(selectedData.valueFrom2)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-slate-300">
                  <span>Dollarization index</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{(selectedData.dollarizationIndex * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedCorridor(null)}
              className="w-full mt-8 bg-[var(--brand)] hover:bg-[var(--brand-700)] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

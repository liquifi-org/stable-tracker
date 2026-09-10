import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { geoCentroid, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { useMapZoomPan } from '../hooks/useMapZoomPan';
import { useCompactMap, useFinePointer } from '../hooks/useMediaQuery';
import { filterMapFeatures, MAP_VIEW_H, MAP_VIEW_W, worldMapProjection } from '../lib/worldMapProjection';
import { MAP_FOCUS_COUNTRY, type MapFocusCountryDetail } from '../lib/mapEvents';
import { nearestPlaces, placeIdFromTarget, resolveMapActivate } from '../lib/mapHitTest';
import { useFilters } from '../context/FilterContext';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';
import { CountryFlag } from './CountryFlag';
import {
  MAP_SVG_CLASS,
  MAP_SVG_FULLSCREEN_CLASS,
  MapDisambiguateList,
  MapFindButton,
  MapLegendFold,
  MapRegionJumps,
  MapStageFrame,
  MapZoomCluster,
} from './MapStage';
import type { CountryAdoptionMetric, RegionalAdoptionMetric } from '../services/api';
import { countryPath } from '../lib/countryRoutes';
import { ISO_COUNTRIES } from '../lib/iso3166';

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
  focusPlace?: string | null;
  focusNonce?: number;
  /** Click a country/region: first click selects, second click on the same place clears. */
  onSelectPlace?: (id: string | null) => void;
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
const NUMERIC_TO_ALPHA2: Record<string, string> = Object.fromEntries(
  ISO_COUNTRIES.map((c) => [c.numeric, c.alpha2]),
);

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
  mode = 'country',
  regionalCorridors = [],
  projectionScale = 140,
  hideAntarctica = false,
  countrySpokeHover = false,
  countries = [],
  regionalAdoption = [],
  focusPlace = null,
  focusNonce = 0,
  onSelectPlace,
}: RealCorridorMapProps) {
  const { formatCurrency: formatValue } = useCurrencyFormat();
  const [worldData, setWorldData] = useState<any>(null);
  const [hoveredCorridor, setHoveredCorridor] = useState<number | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<number | null>(null);
  const [hoveredPlace, setHoveredPlace] = useState<string | null>(null);
  const [pinnedPlace, setPinnedPlace] = useState<string | null>(null);
  const [seenHover, setSeenHover] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [disambiguate, setDisambiguate] = useState<{
    items: { id: string; label: string }[];
    x: number;
    y: number;
  } | null>(null);
  const compact = useCompactMap();
  const finePointer = useFinePointer();
  const hoverEnabled = finePointer;
  const {
    svgRef, setSvgRef, viewBox, zoom, minZoom, maxZoom, zoomIn, zoomOut, resetView, flyTo,
    isDragging, draggedRef, pinchActiveRef, svgListeners,
  } = useMapZoomPan({ coarse: !finePointer });
  const filters = useFilters();
  const navigate = useNavigate();
  const goToCountry = (ref: { name?: string; isoAlpha2?: string; countryId?: string }) => {
    navigate(countryPath(ref), {
      state: { name: ref.name, isoAlpha2: ref.isoAlpha2 },
    });
  };
  const tooltipHoveredRef = useRef(false);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSelectPlaceRef = useRef(onSelectPlace);
  onSelectPlaceRef.current = onSelectPlace;

  const scheduleDismiss = () => {
    dismissTimeoutRef.current = setTimeout(() => {
      if (!tooltipHoveredRef.current) setHoveredCorridor(null);
    }, 80);
  };

  const enterPlace = (code: string) => {
    if (!hoverEnabled) return;
    setSeenHover(true);
    if (pinnedPlace) return;
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    setHoveredPlace(code);
  };
  const leavePlace = () => {
    if (!hoverEnabled || pinnedPlace) return;
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    dismissTimeoutRef.current = setTimeout(() => setHoveredPlace(null), 60);
  };
  const pinPlace = (code: string) => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    setDisambiguate(null);
    if (pinnedPlace === code) {
      closePlace();
      return;
    }
    setPinnedPlace(code);
    setHoveredPlace(code);
    setSeenHover(true);
    onSelectPlaceRef.current?.(code);
  };
  const closePlace = () => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    setPinnedPlace(null);
    setHoveredPlace(null);
    setDisambiguate(null);
    onSelectPlaceRef.current?.(null);
  };

  const handleReset = () => {
    resetView();
  };

  const countryCentroidMap = useMemo(() => {
    const mapped: Record<string, [number, number]> = { ...countryCentroids };
    if (!worldData) return mapped;
    const geojson = feature(worldData, worldData.objects.countries) as GeoJSON.FeatureCollection;
    for (const geo of filterMapFeatures(geojson.features, hideAntarctica)) {
      const alpha2 = NUMERIC_TO_ALPHA2[String(geo.id).padStart(3, '0')];
      if (!alpha2 || countryCentroids[alpha2]) continue;
      const [lon, lat] = geoCentroid(geo as GeoJSON.Feature);
      if (Number.isFinite(lon) && Number.isFinite(lat)) mapped[alpha2] = [lon, lat];
    }
    return mapped;
  }, [worldData, hideAntarctica]);

  const centroids = mode === 'region' ? regionCentroids : countryCentroidMap;
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

  const displayItems = allItems;
  const paintItems = useMemo(() => {
    const top = compact ? displayItems.slice(0, 40) : displayItems;
    const selectedSpokes =
      compact && pinnedPlace
        ? displayItems.filter((c) => c.id1 === pinnedPlace || c.id2 === pinnedPlace)
        : [];
    const seen = new Set<string>();
    const merged: DisplayCorridor[] = [];
    for (const corridor of [...top, ...selectedSpokes]) {
      const key = `${corridor.id1}|${corridor.id2}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(corridor);
    }
    return merged
      .map((corridor, index) => ({ corridor, index }))
      .sort((a, b) => a.corridor.totalValue - b.corridor.totalValue);
  }, [displayItems, compact, pinnedPlace]);

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

  const activePlace = pinnedPlace ?? (hoverEnabled ? hoveredPlace : null);
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
  const corridorCaption = (() => {
    if (hoveredSpokeCount === 0) return 'No international corridors';
    return `${hoveredSpokeCount} international corridor${hoveredSpokeCount === 1 ? '' : 's'}`;
  })();

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
    setDisambiguate(null);
    onSelectPlaceRef.current?.(null);
  }, [filters.year, filters.month, filters.stablecoin, filters.regionFrom, filters.regionTo, mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (fullscreen) setFullscreen(false);
      else if (pinnedPlace) closePlace();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinnedPlace, fullscreen]);

  const features = useMemo(() => {
    if (!worldData) return [];
    const geojson = feature(worldData, worldData.objects.countries) as GeoJSON.FeatureCollection;
    return filterMapFeatures(geojson.features, hideAntarctica);
  }, [worldData, hideAntarctica]);

  const projection = useMemo(() => {
    if (!worldData) return null;
    return worldMapProjection(
      { type: 'FeatureCollection', features },
      { scale: projectionScale, hideAntarctica },
    );
  }, [worldData, features, projectionScale, hideAntarctica]);

  const flyToPlace = (code: string, nextZoom: number) => {
    if (!projection) return;
    const coords = centroids[code] ?? regionCentroids[code];
    if (!coords) return;
    const point = projection(coords);
    if (!point) return;
    flyTo(point[0], point[1], nextZoom);
  };

  useEffect(() => {
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent<MapFocusCountryDetail>).detail;
      const alpha = detail?.isoAlpha2;
      if (!alpha || mode === 'region') return;
      setPinnedPlace(alpha);
      setHoveredPlace(alpha);
      setSeenHover(true);
      setDisambiguate(null);
      onSelectPlaceRef.current?.(alpha);
      if (!projection) return;
      const coords = countryCentroidMap[alpha];
      if (!coords) return;
      const point = projection(coords);
      if (point) flyTo(point[0], point[1], compact ? 3.4 : 2.6);
    };
    window.addEventListener(MAP_FOCUS_COUNTRY, onFocus);
    return () => window.removeEventListener(MAP_FOCUS_COUNTRY, onFocus);
  }, [mode, projection, countryCentroidMap, compact, flyTo]);

  useEffect(() => {
    if (!focusPlace || mode === 'region' || !projection) return;
    setPinnedPlace(focusPlace);
    setHoveredPlace(focusPlace);
    setSeenHover(true);
    setDisambiguate(null);
    const coords = countryCentroidMap[focusPlace];
    if (!coords) return;
    const point = projection(coords);
    if (point) flyTo(point[0], point[1], compact ? 3.4 : 2.6);
  }, [focusPlace, focusNonce, mode, projection, countryCentroidMap, compact, flyTo]);

  const selectableIds = useMemo(() => {
    const ids = new Set<string>();
    if (mode === 'region') {
      for (const id of spokeIds) ids.add(id);
      for (const r of regionalAdoption) ids.add(r.region);
      return ids;
    }
    for (const c of countries) {
      if (c.isoAlpha2) ids.add(c.isoAlpha2);
    }
    for (const id of spokeIds) ids.add(id);
    return ids;
  }, [mode, spokeIds, countries, regionalAdoption]);

  const hitPlaces = useMemo(() => {
    if (!projection) return [];
    const places: { id: string; x: number; y: number }[] = [];
    for (const id of selectableIds) {
      const coords = centroids[id];
      if (!coords) continue;
      const point = projection(coords);
      if (!point) continue;
      places.push({ id, x: point[0], y: point[1] });
    }
    return places;
  }, [selectableIds, centroids, projection]);

  if (!worldData || !projection) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-8 flex items-center justify-center h-[min(58dvh,22rem)] lg:h-[340px]">
        <div className="text-slate-400">Loading world map...</div>
      </div>
    );
  }

  const pathGenerator = geoPath().projection(projection);

  const handleCorridorHover = (_e: React.MouseEvent, index: number) => {
    if (isDragging || !hoverEnabled) return;
    setHoveredCorridor(index);
  };

  const handleCorridorClick = (index: number) => {
    if (draggedRef.current) return;
    setSelectedCorridor(index);
  };

  const activateAt = (clientX: number, clientY: number, target: EventTarget | null) => {
    if (draggedRef.current || pinchActiveRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const hits = nearestPlaces(svg, clientX, clientY, hitPlaces);
    const decision = resolveMapActivate({
      zoom,
      pathId: placeIdFromTarget(target),
      hits,
      selectable: selectableIds,
    });
    if (decision.type === 'disambiguate') {
      const stage = svg.getBoundingClientRect();
      setDisambiguate({
        items: decision.ids.map((id) => ({
          id,
          label: mode === 'country' ? (adoptionByAlpha2.get(id)?.name ?? getLabel(id)) : id,
        })),
        x: clientX - stage.left,
        y: clientY - stage.top,
      });
      return;
    }
    if (decision.type === 'pin') {
      pinPlace(decision.id);
      return;
    }
    closePlace();
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
      <MapStageFrame fullscreen={fullscreen}>
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start max-w-[min(94%,22rem)]">
            <MapFindButton />
            {mode === 'country' && (
              <MapRegionJumps onJump={(id) => flyToPlace(id, compact ? 2.3 : 2)} />
            )}
            {countrySpokeHover && !seenHover && !activePlace && (
              <div className="pointer-events-none text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {hoverEnabled ? 'Hover a country — click to open corridors' : 'Tap a country to open corridors'}
              </div>
            )}
            {countrySpokeHover && hoverEnabled && !pinned && activePlace && (
              <div className="pointer-events-none">
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
                        #{hoveredMetric.adoptionRank} · {fmtPct(hoveredMetric.gdpIntensity)} of GDP
                      </span>
                    )}
                    {mode === 'country' && hoveredMetric && hoveredMetric.relativeAdoptionIndex == null && (
                      <span>Not ranked</span>
                    )}
                    {mode === 'region' && hoveredRegion && (
                      <span>{fmtWallets(hoveredRegion.activeWallets)} wallets</span>
                    )}
                    <span>{corridorCaption}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {disambiguate && (
            <MapDisambiguateList
              items={disambiguate.items}
              x={disambiguate.x}
              y={disambiguate.y}
              onPick={(id) => {
                pinPlace(id);
                flyToPlace(id, Math.max(zoom, 2.8));
              }}
              onDismiss={() => setDisambiguate(null)}
            />
          )}
          <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 sm:left-4 z-10">
            <MapLegendFold title={mode === 'region' ? 'GDP intensity' : 'Rank · Volume'}>
            {showAdoption && (
              <div>
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  {mode === 'region' ? 'GDP intensity by region' : 'GDP intensity rank'}
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
                      {mode === 'region' ? 'No data' : 'No corridor / no GDP'}
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
            </MapLegendFold>
          </div>

          <MapZoomCluster
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={maxZoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={handleReset}
            fullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen((v) => !v)}
          />
          <svg
            ref={setSvgRef}
            viewBox={viewBox}
            className={`${fullscreen ? MAP_SVG_FULLSCREEN_CLASS : MAP_SVG_CLASS} ${zoom > minZoom ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            {...svgListeners}
            onPointerUp={(e) => {
              svgListeners.onPointerUp(e);
              if (e.button !== 0 && e.pointerType === 'mouse') return;
              activateAt(e.clientX, e.clientY, e.target);
            }}
            onMouseLeave={() => {
              if (countrySpokeHover && hoverEnabled && !pinnedPlace) {
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
                  data-place={interactive && hoverKey ? hoverKey : undefined}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  className={interactive ? 'cursor-pointer transition-[fill,opacity,stroke] duration-150' : 'pointer-events-none'}
                  onMouseEnter={interactive && hoverKey ? () => enterPlace(hoverKey) : undefined}
                  onMouseLeave={interactive ? leavePlace : undefined}
                />
              );
            })}

            {paintItems.map(({ corridor, index }) => {
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
                  className={`${countrySpokeHover ? 'pointer-events-none' : 'cursor-pointer'} ${compact ? '' : 'animate-map-draw'} transition-[stroke-width,opacity] duration-150`}
                  filter={lit && !compact ? 'url(#corridor-glow)' : undefined}
                  strokeLinecap="round"
                  style={compact ? undefined : { strokeDasharray: 1, strokeDashoffset: 1 }}
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
                    data-place={countrySpokeHover && hasSpokes ? code : undefined}
                    onMouseEnter={countrySpokeHover && hasSpokes ? () => enterPlace(code) : undefined}
                    onMouseLeave={countrySpokeHover ? leavePlace : undefined}
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

            {countrySpokeHover && pinned && !compact && activePlace && displayItems
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
      </MapStageFrame>

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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { geoCentroid, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { Banknote, Coins, Gem, Cpu, CheckCircle2, XCircle, MinusCircle, ChevronDown } from 'lucide-react';
import { useMapZoomPan } from '../hooks/useMapZoomPan';
import { useCompactMap, useFinePointer } from '../hooks/useMediaQuery';
import { filterMapFeatures, MAP_VIEW_H, MAP_VIEW_W, worldMapProjection } from '../lib/worldMapProjection';
import { MAP_FOCUS_COUNTRY, type MapFocusCountryDetail } from '../lib/mapEvents';
import { nearestPlaces, placeIdFromTarget, resolveMapActivate } from '../lib/mapHitTest';
import { CountryFlag } from './CountryFlag';
import { DataTable } from './DataTable';
import { Skeleton } from './ui/skeleton';
import {
  MAP_SVG_CLASS,
  MAP_SVG_FULLSCREEN_CLASS,
  MapDisambiguateList,
  MapFindButton,
  MapLegendFold,
  MapStageFrame,
  MapZoomCluster,
} from './MapStage';
import { MapInspectorSheet } from './MapInspectorSheet';
import { api, type CountryRegulationInfo } from '../services/api';
import { countryPath } from '../lib/countryRoutes';

const NO_DATA_COLOR = '#e2e8f0';
const FILTERED_OUT_COLOR = '#f1f5f9';

// Electric multi-hue palette (green/amber/violet/red) — vivid and high-contrast
// on the navy theme, keeping the "good → bad" reading.
const STAGE_INFO: Record<number, { label: string; color: string }> = {
  3: { label: 'Live', color: '#00e3a5' },
  2: { label: 'Proposed', color: '#ffaa00' },
  1: { label: 'Draft', color: '#8b5cf6' },
  0: { label: 'No Framework/Banned', color: '#ff3366' },
};

type ReserveTypeKey = 'fiatBacked' | 'cryptoBacked' | 'commodityBacked' | 'algorithmBacked';

const RESERVE_TYPE_DEFS: { key: ReserveTypeKey; label: string; Icon: typeof Banknote }[] = [
  { key: 'fiatBacked', label: 'Fiat-backed', Icon: Banknote },
  { key: 'cryptoBacked', label: 'Crypto-backed', Icon: Coins },
  { key: 'commodityBacked', label: 'Commodity-backed', Icon: Gem },
  { key: 'algorithmBacked', label: 'Algorithm-backed', Icon: Cpu },
];

function ReserveStatusIcon({ value }: { value: number | undefined }) {
  if (value === 1) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (value === 0) return <XCircle className="w-4 h-4 text-red-500" />;
  return <MinusCircle className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
}

export function RegulationPanel({
  paginate = true,
  hideAntarctica = false,
  focusCountryId = null,
  focusNonce = 0,
}: {
  paginate?: boolean;
  hideAntarctica?: boolean;
  focusCountryId?: string | null;
  focusNonce?: number;
}) {
  const navigate = useNavigate();
  const [worldData, setWorldData] = useState<any>(null);
  const [countries, setCountries] = useState<CountryRegulationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [seenHover, setSeenHover] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [disambiguate, setDisambiguate] = useState<{
    items: { id: string; label: string }[];
    x: number;
    y: number;
  } | null>(null);
  const [reserveTypeFilters, setReserveTypeFilters] = useState<Set<ReserveTypeKey>>(new Set());
  const compact = useCompactMap();
  const finePointer = useFinePointer();
  const hoverEnabled = finePointer;
  const onTapRef = useRef<(x: number, y: number, target: EventTarget | null) => void>(() => {});
  const {
    svgRef, setSvgRef, viewBox, zoom, minZoom, maxZoom, zoomIn, zoomOut, resetView, flyTo,
    isDragging,
  } = useMapZoomPan({
    coarse: !finePointer,
    onTap: (x, y, target) => onTapRef.current(x, y, target),
  });
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

  const handleReset = () => {
    resetView();
  };

  useEffect(() => {
    fetch('/world.json')
      .then(res => res.json())
      .then(data => setWorldData(data))
      .catch(err => console.error('Error loading world map:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getCountriesRegulation()
      .then(page => setCountries(page.items))
      .catch(() => setCountries([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!pinnedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinnedId(null);
        setHoveredId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinnedId]);

  const toggleReserveType = (key: ReserveTypeKey) => {
    setReserveTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const matchesFilter = (c: CountryRegulationInfo): boolean => {
    if (reserveTypeFilters.size === 0) return true;
    return Array.from(reserveTypeFilters).some(key => c[key] === 1);
  };

  const filteredCountries = useMemo(
    () => countries.filter(matchesFilter),
    [countries, reserveTypeFilters]
  );

  const countryDataMap = useMemo(
    () => new Map(countries.map(c => [c.countryId, c])),
    [countries]
  );
  const filteredIds = useMemo(
    () => new Set(filteredCountries.map(c => c.countryId)),
    [filteredCountries]
  );

  const tableColumns = [
    {
      key: 'name',
      header: 'Country',
      render: (value: string, row: CountryRegulationInfo) => (
        <span className="flex items-center gap-2">
          {row.isoAlpha2 && <CountryFlag isoAlpha2={row.isoAlpha2} />}
          {value}
        </span>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (value: number | undefined) => {
        const info = value !== undefined ? STAGE_INFO[value] : undefined;
        if (!info) return <span className="text-xs text-slate-400">No data</span>;
        return (
          <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ backgroundColor: `${info.color}1a`, color: info.color }}
          >
            {info.label}
          </span>
        );
      },
    },
    ...RESERVE_TYPE_DEFS.map(({ key, label }) => ({
      key,
      header: label,
      render: (value: number | undefined) => (
        <div className="flex justify-center"><ReserveStatusIcon value={value} /></div>
      ),
    })),
  ];

  const closePlace = () => {
    setPinnedId(null);
    setHoveredId(null);
    setDisambiguate(null);
  };

  const handleCountryClick = (id: string) => {
    const country = countryDataMap.get(id);
    if (!country) return;
    if (pinnedId === id) {
      closePlace();
      return;
    }
    setPinnedId(id);
    setHoveredId(id);
    setSeenHover(true);
    setDisambiguate(null);
  };

  const handleCountryHover = (_e: React.MouseEvent, id: string) => {
    if (!hoverEnabled || isDragging || pinnedId) return;
    setSeenHover(true);
    setHoveredId(id);
  };

  const hoveredCountry = hoverEnabled && !pinnedId && hoveredId ? countryDataMap.get(hoveredId) : null;
  const pinnedCountry = pinnedId ? countryDataMap.get(pinnedId) : null;
  const focusId = pinnedId ?? (hoverEnabled ? hoveredId : null);

  useEffect(() => {
    const onFocus = (e: Event) => {
      const id = (e as CustomEvent<MapFocusCountryDetail>).detail?.countryId;
      if (!id) return;
      setPinnedId(id);
      setHoveredId(id);
      setSeenHover(true);
      setDisambiguate(null);
    };
    window.addEventListener(MAP_FOCUS_COUNTRY, onFocus);
    return () => window.removeEventListener(MAP_FOCUS_COUNTRY, onFocus);
  }, []);

  useEffect(() => {
    if (!focusCountryId) return;
    setPinnedId(focusCountryId);
    setHoveredId(focusCountryId);
    setSeenHover(true);
    setDisambiguate(null);
    if (!worldData) return;
    const geojson = feature(worldData, worldData.objects.countries) as GeoJSON.FeatureCollection;
    const feats = filterMapFeatures(geojson.features, hideAntarctica);
    const proj = worldMapProjection({ type: 'FeatureCollection', features: feats }, { hideAntarctica });
    const geo = feats.find((f) => String(f.id) === focusCountryId);
    if (!geo) return;
    const [lon, lat] = geoCentroid(geo as GeoJSON.Feature);
    const point = Number.isFinite(lon) ? proj([lon, lat]) : null;
    if (point) flyTo(point[0], point[1], compact ? 3.4 : 2.6);
  }, [focusCountryId, focusNonce, worldData, hideAntarctica, compact, flyTo]);

  if (!worldData || (loading && countries.length === 0)) {
    return <Skeleton className="w-full h-[min(58dvh,22rem)] lg:h-[360px] rounded-xl" />;
  }

  const geojson = feature(worldData, worldData.objects.countries) as GeoJSON.FeatureCollection;
  const features = filterMapFeatures(geojson.features, hideAntarctica);
  const projection = worldMapProjection(
    { type: 'FeatureCollection', features },
    { hideAntarctica },
  );
  const pathGenerator = geoPath().projection(projection);
  const selectableIds = new Set(countries.map((c) => c.countryId));
  const hitPlaces = features.flatMap((geo: { id?: string | number }) => {
    const id = String(geo.id);
    if (!selectableIds.has(id)) return [];
    const [lon, lat] = geoCentroid(geo as GeoJSON.Feature);
    const point = Number.isFinite(lon) ? projection([lon, lat]) : null;
    if (!point) return [];
    return [{ id, x: point[0], y: point[1] }];
  });

  const activateAt = (clientX: number, clientY: number, target: EventTarget | null) => {
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
          label: countryDataMap.get(id)?.name ?? id,
        })),
        x: clientX - stage.left,
        y: clientY - stage.top,
      });
      return;
    }
    if (decision.type === 'pin') {
      handleCountryClick(decision.id);
      return;
    }
    closePlace();
  };
  onTapRef.current = activateAt;

  const inspector = pinnedCountry ? (
    <>
      <div className="bg-[var(--brand)]/10 dark:bg-[var(--brand)]/15 px-4 py-2 border-b border-slate-200 dark:border-neutral-700">
        <h3 className="font-bold text-[var(--brand-700)] dark:text-[var(--brand-300)] text-lg flex items-center gap-2">
          {pinnedCountry.isoAlpha2 && (
            <CountryFlag isoAlpha2={pinnedCountry.isoAlpha2} className="w-5 h-5" />
          )}
          {pinnedCountry.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{pinnedCountry.region}</p>
      </div>
      <div className="px-4 py-3 text-xs space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400">Stage</span>
          <span className="text-slate-800 dark:text-slate-100 font-semibold">
            {pinnedCountry.stage !== undefined ? STAGE_INFO[pinnedCountry.stage]?.label ?? '—' : 'No data'}
          </span>
        </div>
        {RESERVE_TYPE_DEFS.map(({ key, label }) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">{label}</span>
            <ReserveStatusIcon value={pinnedCountry[key]} />
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-slate-200 dark:border-neutral-700 flex items-center gap-2 flex-wrap justify-end">
        <button
          type="button"
          onClick={() => {
            navigate(countryPath({
              countryId: pinnedCountry.countryId,
              name: pinnedCountry.name,
              isoAlpha2: pinnedCountry.isoAlpha2,
            }), {
              state: { name: pinnedCountry.name, isoAlpha2: pinnedCountry.isoAlpha2 },
            });
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-[var(--brand)] hover:bg-[var(--brand-700)] transition-colors"
        >
          Details
        </button>
        <button
          type="button"
          onClick={closePlace}
          className="px-3 py-1.5 text-xs font-semibold rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors"
        >
          Close
        </button>
      </div>
    </>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-4">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Filter by reserve type allowed <span className="text-xs text-slate-400 font-normal">(matches any selected)</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap overflow-x-auto">
          {RESERVE_TYPE_DEFS.map(({ key, label, Icon }) => {
            const active = reserveTypeFilters.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleReserveType(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-ui shrink-0 ${
                  active
                    ? 'text-white border-transparent'
                    : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-slate-300 border-slate-200/50 dark:border-neutral-700 hover:border-[var(--brand)]'
                }`}
                style={active ? { backgroundColor: 'var(--brand)' } : {}}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative space-y-3">
        <MapStageFrame fullscreen={fullscreen}>
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start max-w-[min(94%,20rem)]">
              <MapFindButton />
              {!seenHover && !focusId && (
                <div className="pointer-events-none text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {hoverEnabled ? 'Hover a country — click to select' : 'Tap a country'}
                </div>
              )}
              {!pinnedId && hoveredCountry && (
                <div className="pointer-events-none">
                  <div className="rounded-lg bg-neutral-950/90 dark:bg-neutral-950/92 border border-white/15 px-3 py-2 text-xs text-white">
                    <div className="flex items-center gap-2 min-w-0">
                      {hoveredCountry.isoAlpha2 && (
                        <CountryFlag isoAlpha2={hoveredCountry.isoAlpha2} className="w-4 h-4 shrink-0" />
                      )}
                      <span className="font-semibold truncate">{hoveredCountry.name}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-white/70">
                      {hoveredCountry.stage !== undefined ? STAGE_INFO[hoveredCountry.stage]?.label ?? 'No data' : 'No data'}
                      {hoveredCountry.region ? ` · ${hoveredCountry.region}` : ''}
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
                onPick={(id) => handleCountryClick(id)}
                onDismiss={() => setDisambiguate(null)}
              />
            )}
            <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 sm:left-4 z-10">
              <MapLegendFold title="Regulatory stage">
                <div className="space-y-1">
                  {[3, 2, 1, 0].map((stage) => (
                    <div key={stage} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm shrink-0 border border-slate-200 dark:border-neutral-600" style={{ backgroundColor: STAGE_INFO[stage].color }} />
                      <span className="text-[11px] text-slate-700 dark:text-slate-300">{STAGE_INFO[stage].label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm shrink-0 border border-slate-200 dark:border-neutral-600" style={{ backgroundColor: NO_DATA_COLOR }} />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">No data</span>
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
              onMouseLeave={() => {
                if (hoverEnabled && !pinnedId) setHoveredId(null);
              }}
            >
              <defs>
                <filter id="regulation-glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
                const numericId = String(geo.id);
                const countryData = countryDataMap.get(numericId);
                const isFilteredOut = countryData ? !filteredIds.has(numericId) : false;

                let fillColor = NO_DATA_COLOR;
                let strokeColor = '#cbd5e1';
                let strokeWidth = 0.5;
                let opacity = 0.8;

                if (countryData) {
                  if (isFilteredOut) {
                    fillColor = FILTERED_OUT_COLOR;
                    strokeColor = '#cbd5e1';
                    opacity = 0.5;
                  } else if (countryData.stage !== undefined && STAGE_INFO[countryData.stage]) {
                    fillColor = STAGE_INFO[countryData.stage].color;
                    strokeColor = '#64748b';
                    strokeWidth = 1;
                    opacity = 0.9;
                  }
                }

                const isFocus = focusId === numericId;
                if (isFocus) {
                  strokeColor = 'var(--brand-400)';
                  strokeWidth = 2;
                  opacity = 1;
                }

                const pathData = pathGenerator(geo as any);
                if (!pathData) return null;

                return (
                  <path
                    key={i}
                    d={pathData}
                    data-place={numericId}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                    onMouseEnter={(e) => handleCountryHover(e, numericId)}
                    onMouseLeave={() => {
                      if (hoverEnabled && !pinnedId) setHoveredId(null);
                    }}
                    className="cursor-pointer transition-[fill,opacity,stroke-width] duration-150 ease-out"
                    filter={isFocus && !compact ? 'url(#regulation-glow)' : undefined}
                  />
                );
              })}
            </svg>
            {pinnedId && !compact && (
              <button
                type="button"
                onClick={scrollToInspector}
                className="flex w-full flex-col items-center gap-0.5 pt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                See details
                <ChevronDown className="w-3.5 h-3.5" aria-hidden />
              </button>
            )}
        </MapStageFrame>

        {compact ? (
          <MapInspectorSheet
            open={Boolean(pinnedCountry)}
            overlay={fullscreen}
            onOpenChange={(open) => {
              if (!open) closePlace();
            }}
            title={pinnedCountry?.name ?? 'Country'}
          >
            {inspector}
          </MapInspectorSheet>
        ) : (
          inspector && (
          <div
            ref={inspectorRef}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/50 dark:border-neutral-700 overflow-hidden"
          >
            {inspector}
          </div>
          )
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Regulatory Details</h4>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Showing {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'}
          </div>
        </div>
        {filteredCountries.length === 0 ? (
          <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
            No countries match the current filters
          </div>
        ) : (
          <DataTable
            data={filteredCountries}
            columns={tableColumns}
            pageSize={10}
            paginate={paginate}
            resetKey={[...reserveTypeFilters].join(',')}
            onRowClick={(row) =>
              navigate(countryPath({ countryId: row.countryId, name: row.name, isoAlpha2: row.isoAlpha2 }), {
                state: { name: row.name, isoAlpha2: row.isoAlpha2 },
              })
            }
          />
        )}
      </div>
    </div>
  );
}

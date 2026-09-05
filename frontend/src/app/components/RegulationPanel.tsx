import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { Banknote, Coins, Gem, Cpu, CheckCircle2, XCircle, MinusCircle, Plus, Minus, RotateCcw, ChevronDown } from 'lucide-react';
import { useMapZoomPan } from '../hooks/useMapZoomPan';
import { filterMapFeatures, MAP_VIEW_H, MAP_VIEW_W, worldMapProjection } from '../lib/worldMapProjection';
import { CountryFlag } from './CountryFlag';
import { DataTable } from './DataTable';
import { Skeleton } from './ui/skeleton';
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
}: {
  paginate?: boolean;
  hideAntarctica?: boolean;
}) {
  const navigate = useNavigate();
  const [worldData, setWorldData] = useState<any>(null);
  const [countries, setCountries] = useState<CountryRegulationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [seenHover, setSeenHover] = useState(false);
  const [reserveTypeFilters, setReserveTypeFilters] = useState<Set<ReserveTypeKey>>(new Set());
  const {
    svgRef, viewBox, zoom, minZoom, maxZoom, zoomIn, zoomOut, resetView,
    isDragging, draggedRef, handleMouseDown, handleMouseMove: handlePanMove, endDrag,
  } = useMapZoomPan();
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
  };

  const handleCountryClick = (id: string) => {
    if (draggedRef.current) return;
    const country = countryDataMap.get(id);
    if (!country) return;
    if (pinnedId === id) {
      closePlace();
      return;
    }
    setPinnedId(id);
    setHoveredId(id);
  };

  const handleCountryHover = (_e: React.MouseEvent, id: string) => {
    if (isDragging || pinnedId) return;
    setSeenHover(true);
    setHoveredId(id);
  };

  const hoveredCountry = !pinnedId && hoveredId ? countryDataMap.get(hoveredId) : null;
  const pinnedCountry = pinnedId ? countryDataMap.get(pinnedId) : null;
  const focusId = pinnedId ?? hoveredId;

  if (!worldData || (loading && countries.length === 0)) {
    return <Skeleton className="w-full h-[200px] sm:h-[360px] rounded-xl" />;
  }

  const geojson = feature(worldData, worldData.objects.countries) as GeoJSON.FeatureCollection;
  const features = filterMapFeatures(geojson.features, hideAntarctica);
  const projection = worldMapProjection(
    { type: 'FeatureCollection', features },
    { hideAntarctica },
  );
  const pathGenerator = geoPath().projection(projection);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-4 shadow-md">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Filter by reserve type allowed <span className="text-xs text-slate-400 font-normal">(matches any selected)</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {RESERVE_TYPE_DEFS.map(({ key, label, Icon }) => {
            const active = reserveTypeFilters.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleReserveType(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-ui ${
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
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/50 dark:border-neutral-700 overflow-hidden transition-ui">
          <div className="relative px-5 py-3 bg-[#F7FAFC] dark:bg-neutral-900">
            {!seenHover && !focusId && (
              <div className="absolute top-4 left-4 z-20 pointer-events-none text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Hover a country — click to select
              </div>
            )}
            {!pinnedId && hoveredCountry && (
              <div className="absolute top-4 left-4 z-20 pointer-events-none max-w-[min(94%,20rem)]">
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
            {/* Legend — bottom-left, opposite zoom controls */}
            <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-slate-200/60 dark:border-neutral-700 rounded-lg p-2.5 shadow-md">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Regulatory stage</div>
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
                if (!pinnedId) setHoveredId(null);
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
                onClick={() => {
                  if (draggedRef.current) return;
                  closePlace();
                }}
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
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                    onMouseEnter={(e) => handleCountryHover(e, numericId)}
                    onMouseLeave={() => {
                      if (!pinnedId) setHoveredId(null);
                    }}
                    onClick={() => handleCountryClick(numericId)}
                    className="cursor-pointer transition-[fill,opacity,stroke-width] duration-150 ease-out"
                    filter={isFocus ? 'url(#regulation-glow)' : undefined}
                  />
                );
              })}
            </svg>
            {pinnedId && (
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

        {pinnedCountry && (
          <div
            ref={inspectorRef}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/50 dark:border-neutral-700 overflow-hidden"
          >
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
          </div>
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

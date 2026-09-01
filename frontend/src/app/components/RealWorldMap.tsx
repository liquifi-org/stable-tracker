import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { geoPath, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { useMapZoomPan } from '../hooks/useMapZoomPan';
import { SourceBadge } from './SourceBadge';
import { CountryFlag } from './CountryFlag';
import type { CountryAdoptionMetric, RegionalAdoptionMetric } from '../services/api';

type MapViewMode = 'country' | 'region';

interface RealWorldMapProps {
  countries: CountryAdoptionMetric[];
  mode?: MapViewMode;
  regionalData?: RegionalAdoptionMetric[];
}

const NO_DATA_COLOR = '#e2e8f0';

// Electric blue ramp, same hue family as the brand color, deepest at the top end.
const ADOPTION_BUCKETS = [
  { min: 0.8, color: '#1a4fd6', label: 'Highest' },
  { min: 0.6, color: '#3f74e3', label: 'High' },
  { min: 0.4, color: '#6f9aed', label: 'Mid' },
  { min: 0.2, color: '#a3c2f5', label: 'Low' },
  { min: 0,   color: '#d6e4fb', label: 'Lowest' },
];

/** Colors assigned to macro regions ranked 1st/2nd/3rd by adoption rate. */
const REGION_RANK_COLORS = ['#1a4fd6', '#6f9aed', '#d6e4fb'];

/** Color by rank-normalized relative adoption index (0..1), bucketed into quintiles. Only called when ranked. */
function getColor(relativeAdoptionIndex: number): string {
  const t = Math.min(1, Math.max(0, relativeAdoptionIndex));
  return ADOPTION_BUCKETS.find((b) => t >= b.min)!.color;
}

const ELIGIBILITY_THRESHOLD = 10_000;

function fmtPct(ratio: number): string {
  const pct = ratio * 100;
  if (pct < 0.01) return pct.toFixed(4) + '%';
  if (pct < 1)    return pct.toFixed(2) + '%';
  return pct.toFixed(1) + '%';
}

function fmtWallets(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function RealWorldMap({ countries, mode = 'country', regionalData = [] }: RealWorldMapProps) {
  const [worldData, setWorldData] = useState<any>(null);
  /** numeric countryId of hovered feature */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const {
    svgRef, viewBox, zoom, minZoom, maxZoom, zoomIn, zoomOut, resetView,
    isDragging, draggedRef, handleMouseDown, handleMouseMove: handlePanMove, endDrag,
  } = useMapZoomPan();

  useEffect(() => {
    fetch('/world.json')
      .then(res => res.json())
      .then(data => setWorldData(data))
      .catch(err => console.error('Error loading world map:', err));
  }, []);

  if (!worldData) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-8 flex items-center justify-center h-[300px] sm:h-[600px]">
        <div className="text-slate-400">Loading world map...</div>
      </div>
    );
  }

  const projection = geoMercator()
    .scale(140)
    .translate([800 / 2, 500 / 2]);

  const pathGenerator = geoPath().projection(projection);
  const geojson = feature(worldData, worldData.objects.countries);

  const countryDataMap = new Map(countries.map(c => [c.countryId, c]));
  const regionDataMap = new Map(regionalData.map(r => [r.region, r]));
  const rankedRegions = [...regionalData].sort((a, b) => b.adoptionRate - a.adoptionRate);
  const regionColorMap = new Map(rankedRegions.map((r, i) => [r.region, REGION_RANK_COLORS[i] ?? NO_DATA_COLOR]));

  const handleCountryClick = (id: string) => {
    if (draggedRef.current) return;
    const countryData = countryDataMap.get(id);
    navigate(`/country/${id}`, {
      state: { name: countryData?.name, isoAlpha2: countryData?.isoAlpha2 },
    });
  };

  const handleCountryHover = (e: React.MouseEvent, id: string) => {
    if (isDragging) return;
    setHoveredId(id);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const getFillColor = (countryData: CountryAdoptionMetric | undefined): string | null => {
    if (!countryData) return null;
    if (mode === 'region') {
      return countryData.macroRegion ? regionColorMap.get(countryData.macroRegion) ?? null : null;
    }
    return countryData.relativeAdoptionIndex !== null ? getColor(countryData.relativeAdoptionIndex) : null;
  };

  const hoveredCountry = hoveredId ? countryDataMap.get(hoveredId) : null;

  const hoveredRegion =
    mode === 'region' && hoveredCountry?.macroRegion ? regionDataMap.get(hoveredCountry.macroRegion) : null;

  // Tooltip tracks the cursor, so on narrow viewports it must shrink and stay clamped
  // to the screen edge instead of overflowing horizontally off a 650px desktop width.
  const tooltipWidth = Math.min(window.innerWidth * 0.94, 650);
  const tooltipLeft = Math.min(tooltipPos.x + 15, window.innerWidth - tooltipWidth - 10);
  const tooltipTop = Math.max(8, tooltipPos.y - 120);

  return (
    <div className="relative">
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/50 dark:border-neutral-700 overflow-hidden shadow-md transition-all duration-300">
        <div className="relative p-6 bg-[#F7FAFC] dark:bg-neutral-900">
          {/* Legend — bottom-left, opposite zoom controls */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-slate-200/60 dark:border-neutral-700 rounded-lg p-2.5 shadow-md">
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

          <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= maxZoom}
              aria-label="Zoom in"
              className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 shadow-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= minZoom}
              aria-label="Zoom out"
              className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 shadow-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetView}
              disabled={zoom <= minZoom}
              aria-label="Reset view"
              title="Reset view"
              className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 shadow-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className={`w-full aspect-[8/5] ${zoom > minZoom ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handlePanMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            <defs>
              <filter id="world-glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <rect width="800" height="500" className="fill-[#F7FAFC] dark:fill-neutral-900" />

            {geojson.features.map((geo: any, i: number) => {
              const numericId = String(geo.id);
              const countryData = countryDataMap.get(numericId);

              let fillColor = NO_DATA_COLOR;
              let strokeColor = '#cbd5e1';
              let strokeWidth = 0.5;
              let opacity = 0.8;

              const resolvedColor = getFillColor(countryData);
              if (resolvedColor) {
                fillColor = resolvedColor;
                strokeColor = '#64748b';
                strokeWidth = 1;
                opacity = 0.9;
              }

              const isHovered = hoveredId === numericId;

              if (isHovered) {
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
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleCountryClick(numericId)}
                  className="cursor-pointer transition-all"
                  filter={isHovered ? 'url(#world-glow)' : undefined}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {hoveredId && hoveredCountry && (
        <div
          className="fixed z-50 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md border border-[var(--brand)]/30 dark:border-[var(--brand)]/40 rounded-lg shadow-lg pointer-events-none transition-all"
          style={{ left: tooltipLeft, top: tooltipTop, width: tooltipWidth }}
        >
          {mode === 'region' ? (
            <>
              <div className="bg-[var(--brand)]/10 dark:bg-[var(--brand)]/15 px-4 py-2 border-b border-slate-200 dark:border-neutral-700">
                <h3 className="font-bold text-[var(--brand-700)] dark:text-[var(--brand-300)] text-lg">{hoveredCountry.macroRegion ?? 'Unmapped region'}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{hoveredCountry.name}</p>
              </div>
              {hoveredRegion ? (
                <div className="px-4 py-3 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Adoption rate (region population)</span>
                    <span className="text-slate-800 dark:text-slate-100 font-bold text-base">{fmtPct(hoveredRegion.adoptionRate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Wallets holding stablecoins</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold">{fmtWallets(hoveredRegion.activeWallets)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Stablecoin TX value share</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold">{fmtPct(hoveredRegion.txValueShare)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Countries in region</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold">{hoveredRegion.countryCount}</span>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic">No data available for this period</div>
              )}
            </>
          ) : (
            <>
              <div className="bg-[var(--brand)]/10 dark:bg-[var(--brand)]/15 px-4 py-2 border-b border-slate-200 dark:border-neutral-700">
                <h3 className="font-bold text-[var(--brand-700)] dark:text-[var(--brand-300)] text-lg flex items-center gap-2">
                  <CountryFlag isoAlpha2={hoveredCountry.isoAlpha2} className="w-5 h-5" />
                  {hoveredCountry.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{hoveredCountry.region}</p>
              </div>

              {hoveredCountry.relativeAdoptionIndex !== null ? (
                <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-neutral-700">
                  <div className="px-4 py-3">
                    <div className="text-xs font-semibold text-[var(--brand-700)] dark:text-[var(--brand-300)] italic mb-3">Adoption</div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Adoption index (rank)</span>
                        <span className="text-slate-800 dark:text-slate-100 font-bold text-base">#{hoveredCountry.adoptionRank}<span className="text-slate-500 dark:text-slate-400 text-xs font-normal"> of {hoveredCountry.eligibleCountries}</span></span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Wallets holding stablecoins</span>
                        <span className="text-slate-800 dark:text-slate-100 font-semibold">{fmtWallets(hoveredCountry.activeWallets)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-xs font-semibold text-[var(--brand-700)] dark:text-[var(--brand-300)] italic mb-3">Economic integration</div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Stablecoin TX value share</span>
                        <span className="text-slate-800 dark:text-slate-100 font-bold text-base">{fmtPct(hoveredCountry.txValueShare)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : hoveredCountry.activeWallets > 0 ? (
                <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic">
                  Not enough wallets to rank ({fmtWallets(hoveredCountry.activeWallets)} holding stablecoins — needs &gt;{fmtWallets(ELIGIBILITY_THRESHOLD)})
                </div>
              ) : (
                <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic">No data available for this period</div>
              )}
            </>
          )}
          <div className="px-4 py-2 border-t border-slate-200 dark:border-neutral-700 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <span>Data provided by</span>
            <SourceBadge source="allium" label={mode === 'region' ? 'Regional adoption data' : 'Adoption data'} />
          </div>
        </div>
      )}
    </div>
  );
}

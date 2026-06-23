import { useState, useEffect, useMemo } from 'react';
import { geoPath, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { useMapZoomPan } from '../hooks/useMapZoomPan';
import { useFilters } from '../context/FilterContext';
import { SourceBadge } from './SourceBadge';

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

const countryCodeToISO2: Record<string, string> = {
  US: 'us', MX: 'mx', BR: 'br', AR: 'ar', VE: 've',
  GB: 'gb', FR: 'fr', DE: 'de', TR: 'tr', NG: 'ng',
  KE: 'ke', IN: 'in', CN: 'cn', JP: 'jp', PH: 'ph',
  AU: 'au', AT: 'at', TW: 'tw', ID: 'id', KR: 'kr',
  NL: 'nl', ZA: 'za', UA: 'ua', IR: 'ir',
};

const countryCentroids: Record<string, [number, number]> = {
  US: [-95, 38],   MX: [-102, 23],  BR: [-47, -14],  AR: [-64, -34],  VE: [-66, 8],
  GB: [-2, 54],    FR: [2, 47],     DE: [10, 51],    TR: [35, 39],    NG: [8, 9],
  KE: [38, 1],     IN: [78, 22],    CN: [105, 35],   JP: [138, 36],   PH: [122, 12],
  AU: [134, -25],  AT: [14.5, 47.5], TW: [121, 23.5], ID: [118, -2],  KR: [128, 36],
  NL: [5.3, 52.4], ZA: [25, -29],   UA: [32, 48.4],  IR: [53, 32],
};

/** Representative centroid per macro region, for the region-mode map. */
const regionCentroids: Record<string, [number, number]> = {
  Americas: [-80, 5],
  EMEIA: [20, 25],
  APAC: [110, 8],
};

function formatValue(value: number): string {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
  return `$${value}`;
}

export function RealCorridorMap({ corridors, getCountryName, limit, mode = 'country', regionalCorridors = [] }: RealCorridorMapProps) {
  const [worldData, setWorldData] = useState<any>(null);
  const [hoveredCorridor, setHoveredCorridor] = useState<number | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const {
    svgRef, viewBox, zoom, minZoom, maxZoom, zoomIn, zoomOut, resetView,
    isDragging, draggedRef, handleMouseDown, handleMouseMove: handlePanMove, endDrag,
  } = useMapZoomPan();
  const filters = useFilters();

  const hasActiveFilters =
    filters.country !== 'All' || filters.regionFrom !== 'All' ||
    filters.regionTo !== 'All' || filters.stablecoin !== 'All';

  const handleReset = () => {
    resetView();
    filters.setCountry('All');
    filters.setRegionFrom('All');
    filters.setRegionTo('All');
    filters.setStablecoin('All');
  };

  const centroids = mode === 'region' ? regionCentroids : countryCentroids;
  const getLabel = mode === 'region' ? (id: string) => id : getCountryName;

  // Sort by total volume descending; apply optional limit (country mode only —
  // region mode only ever has a handful of pairs, so showing all is fine).
  const displayItems: DisplayCorridor[] = useMemo(() => {
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
    const sorted = [...corridors]
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
    return limit !== undefined ? sorted.slice(0, limit) : sorted;
  }, [mode, corridors, regionalCorridors, limit]);

  const maxVolume = displayItems[0]?.totalValue ?? 1;
  const minVolume = displayItems[displayItems.length - 1]?.totalValue ?? 0;
  const volumeRange = Math.max(maxVolume - minVolume, 1);

  // Stroke width: 1.5px (lowest) → 5px (highest), relative to the visible set
  function lineWidth(value: number): number {
    return 1.5 + ((value - minVolume) / volumeRange) * 3.5;
  }

  // Electric blue ramp, matching RealWorldMap's ADOPTION_BUCKETS.
  function lineColor(value: number): string {
    const ratio = (value - minVolume) / volumeRange;
    if (ratio >= 0.8) return '#1a4fd6';
    if (ratio >= 0.6) return '#3f74e3';
    if (ratio >= 0.4) return '#6f9aed';
    if (ratio >= 0.2) return '#a3c2f5';
    return '#d6e4fb';
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

  if (!worldData) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-8 flex items-center justify-center" style={{ height: '600px' }}>
        <div className="text-slate-400">Loading world map...</div>
      </div>
    );
  }

  const projection = geoMercator()
    .scale(140)
    .translate([800 / 2, 500 / 2]);

  const pathGenerator = geoPath().projection(projection);
  const geojson = feature(worldData, worldData.objects.countries);

  const handleCorridorHover = (e: React.MouseEvent, index: number) => {
    if (isDragging) return;
    setHoveredCorridor(index);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleCorridorClick = (index: number) => {
    if (draggedRef.current) return;
    setSelectedCorridor(index);
  };

  const hoveredData = hoveredCorridor !== null ? displayItems[hoveredCorridor] : null;
  const selectedData = selectedCorridor !== null ? displayItems[selectedCorridor] : null;

  const legendItems = [
    { label: 'Low', width: 1.5, color: '#d6e4fb' },
    { label: 'Mid', width: 2.5, color: '#a3c2f5' },
    { label: 'High', width: 3.5, color: '#6f9aed' },
    { label: 'Peak', width: 5, color: '#1a4fd6' },
  ];

  return (
    <div className="relative">
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/50 dark:border-neutral-700 overflow-hidden shadow-md transition-all">
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-neutral-700 flex justify-between items-center" style={{ backgroundColor: 'var(--brand)' }}>
          <span className="text-sm text-white font-medium">
            {mode === 'region'
              ? `${displayItems.length} region ${displayItems.length === 1 ? 'corridor' : 'corridors'}`
              : limit !== undefined ? `Top ${displayItems.length} corridors by volume` : `${displayItems.length} corridors`} · line width = relative volume
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/70">{formatValue(minVolume)}</span>
            {legendItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <svg width="28" height="12">
                  <line x1="0" y1="6" x2="28" y2="6" stroke={item.color} strokeWidth={item.width} strokeLinecap="round" />
                </svg>
              </div>
            ))}
            <span className="text-xs text-white/70">{formatValue(maxVolume)}</span>
          </div>
        </div>

        <div className="relative p-6 bg-[#F7FAFC] dark:bg-neutral-900">
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
              onClick={handleReset}
              disabled={zoom <= minZoom && !hasActiveFilters}
              aria-label="Reset view and filters"
              title="Reset view and filters"
              className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 shadow-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className={`w-full ${zoom > minZoom ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            style={{ height: '550px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handlePanMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
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

            <rect width="800" height="500" className="fill-[#F7FAFC] dark:fill-neutral-900" />

            {geojson.features.map((geo: any, i: number) => {
              const pathData = pathGenerator(geo as any);
              if (!pathData) return null;

              return (
                <path
                  key={i}
                  d={pathData}
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  strokeWidth={0.5}
                  opacity={0.6}
                  className="pointer-events-none"
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

              const isHovered = hoveredCorridor === index;
              const isSelected = selectedCorridor === index;
              const sw = lineWidth(corridor.totalValue);
              const color = lineColor(corridor.totalValue);

              const dx = toPoint[0] - fromPoint[0];
              const dy = toPoint[1] - fromPoint[1];
              const distance = Math.sqrt(dx * dx + dy * dy);
              const offset = distance * 0.15;

              const midX = (fromPoint[0] + toPoint[0]) / 2;
              const midY = (fromPoint[1] + toPoint[1]) / 2;
              const perpX = -dy / distance;
              const perpY = dx / distance;
              const controlX = midX + perpX * offset;
              const controlY = midY + perpY * offset;

              const path = `M ${fromPoint[0]} ${fromPoint[1]} Q ${controlX} ${controlY} ${toPoint[0]} ${toPoint[1]}`;

              return (
                <path
                  key={index}
                  d={path}
                  stroke={isHovered || isSelected ? '#fff' : color}
                  strokeWidth={isHovered || isSelected ? sw + 1.5 : sw}
                  fill="none"
                  opacity={isHovered || isSelected ? 1 : 0.85}
                  onMouseEnter={(e) => handleCorridorHover(e, index)}
                  onMouseLeave={() => setHoveredCorridor(null)}
                  onClick={() => handleCorridorClick(index)}
                  className="cursor-pointer transition-all duration-300"
                  filter={isHovered || isSelected ? 'url(#corridor-glow)' : undefined}
                  strokeLinecap="round"
                />
              );
            })}

            {Object.entries(centroids).map(([code, coords]) => {
              const point = projection(coords);
              if (!point) return null;

              if (mode === 'region') {
                return (
                  <g key={code}>
                    <circle
                      cx={point[0]}
                      cy={point[1]}
                      r={18}
                      fill="var(--brand)"
                      stroke="#475569"
                      strokeWidth={1.5}
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

              const iso2 = countryCodeToISO2[code];
              if (!iso2) return null;

              return (
                <g key={code}>
                  <circle
                    cx={point[0]}
                    cy={point[1]}
                    r={10}
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth={1.5}
                  />
                  <image
                    href={`https://flagcdn.com/w40/${iso2}.png`}
                    x={point[0] - 8}
                    y={point[1] - 6}
                    width="16"
                    height="12"
                    className="pointer-events-none"
                    style={{ borderRadius: '2px' }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {hoveredData && (
        <div
          className="fixed z-50 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md border border-[var(--brand)]/30 dark:border-[var(--brand)]/40 rounded-lg shadow-lg pointer-events-none transition-all"
          style={{ left: tooltipPos.x + 15, top: tooltipPos.y - 100, minWidth: '500px' }}
        >
          <div className="bg-[var(--brand)]/10 dark:bg-[var(--brand)]/15 px-4 py-2 border-b border-slate-200 dark:border-neutral-700">
            <h3 className="font-bold text-[var(--brand-700)] dark:text-[var(--brand-300)] text-lg text-center">
              {getLabel(hoveredData.id1)} &lt;-&gt; {getLabel(hoveredData.id2)}
            </h3>
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-neutral-700">
                  <th className="bg-slate-50 dark:bg-neutral-900 p-2 text-left"></th>
                  <th className="bg-slate-50 dark:bg-neutral-900 p-2 text-center text-[var(--brand-700)] dark:text-[var(--brand-300)] italic font-semibold border-l border-slate-200 dark:border-neutral-700">
                    {getLabel(hoveredData.id1)} -&gt; {getLabel(hoveredData.id2)}
                  </th>
                  <th className="bg-slate-50 dark:bg-neutral-900 p-2 text-center text-[var(--brand-700)] dark:text-[var(--brand-300)] italic font-semibold border-l border-slate-200 dark:border-neutral-700">
                    {getLabel(hoveredData.id2)} -&gt; {getLabel(hoveredData.id1)}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200 dark:border-neutral-700">
                  <td className="p-2 text-slate-600 dark:text-slate-300 bg-slate-50/60 dark:bg-neutral-900/60">Stablecoin value</td>
                  <td className="p-2 text-center text-slate-800 dark:text-slate-100 font-bold border-l border-slate-200 dark:border-neutral-700">
                    {formatValue(hoveredData.valueFrom1)}
                  </td>
                  <td className="p-2 text-center text-slate-800 dark:text-slate-100 font-bold border-l border-slate-200 dark:border-neutral-700">
                    {formatValue(hoveredData.valueFrom2)}
                  </td>
                </tr>
                {mode === 'country' && (
                  <tr className="border-b border-slate-200 dark:border-neutral-700">
                    <td className="p-2 text-slate-600 dark:text-slate-300 bg-slate-50/60 dark:bg-neutral-900/60 align-top">Stablecoin share (%)</td>
                    <td className="p-2 border-l border-slate-200 dark:border-neutral-700 bg-slate-50/40 dark:bg-neutral-900/40">
                      {(hoveredData.topStablecoinsFrom1 ?? []).map(s => (
                        <div key={s.name} className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400 italic">{s.name}</span>
                          <span className="text-slate-800 dark:text-slate-100 font-semibold">{Math.round(s.share * 100)}%</span>
                        </div>
                      ))}
                      {!hoveredData.topStablecoinsFrom1?.length && <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </td>
                    <td className="p-2 border-l border-slate-200 dark:border-neutral-700 bg-slate-50/40 dark:bg-neutral-900/40">
                      {(hoveredData.topStablecoinsFrom2 ?? []).map(s => (
                        <div key={s.name} className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400 italic">{s.name}</span>
                          <span className="text-slate-800 dark:text-slate-100 font-semibold">{Math.round(s.share * 100)}%</span>
                        </div>
                      ))}
                      {!hoveredData.topStablecoinsFrom2?.length && <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-200 dark:border-neutral-700 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <span>Data provided by</span>
            <SourceBadge source="allium" label="Corridor volume data" />
          </div>
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

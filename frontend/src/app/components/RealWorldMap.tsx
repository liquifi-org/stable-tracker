import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { geoPath, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';
import type { CountryAdoptionMetric } from '../services/api';

interface RealWorldMapProps {
  countries: CountryAdoptionMetric[];
}

/** Color by adoption rate (0..1 ratio). Only called when activeWallets > 0. */
function getColor(adoptionRate: number): string {
  if (adoptionRate < 0.0001) return '#D1FAE5';   // < 0.01 %
  if (adoptionRate < 0.001)  return '#6EE7B7';   // 0.01 – 0.1 %
  if (adoptionRate < 0.005)  return '#34D399';   // 0.1 – 0.5 %
  if (adoptionRate < 0.02)   return '#10B981';   // 0.5 – 2 %
  return '#047857';                              // > 2 %
}

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

export function RealWorldMap({ countries }: RealWorldMapProps) {
  const [worldData, setWorldData] = useState<any>(null);
  /** numeric countryId of hovered / selected feature */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/world.json')
      .then(res => res.json())
      .then(data => setWorldData(data))
      .catch(err => console.error('Error loading world map:', err));
  }, []);

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

  const countryDataMap = new Map(countries.map(c => [c.countryId, c]));

  const handleCountryClick = (id: string) => setSelectedId(id);

  const handleViewDetails = () => {
    if (selectedId) {
      navigate(`/country/${selectedId}`);
      setSelectedId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent, id: string) => {
    setHoveredId(id);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const hoveredData  = hoveredId  ? countryDataMap.get(hoveredId)  : null;
  const selectedData = selectedId ? countryDataMap.get(selectedId) : null;

  const legendItems = [
    { label: '< 0.01%',    color: '#D1FAE5' },
    { label: '0.01–0.1%',  color: '#6EE7B7' },
    { label: '0.1–0.5%',   color: '#34D399' },
    { label: '0.5–2%',     color: '#10B981' },
    { label: '> 2%',       color: '#047857' },
  ];

  return (
    <div className="relative">
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/50 dark:border-neutral-700 overflow-hidden shadow-md transition-all duration-300">
        <div className="p-6 border-b border-slate-200/50 dark:border-neutral-700" style={{ backgroundColor: 'var(--brand)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white font-medium">% Population using stablecoins</span>
            <div className="flex items-center gap-4">
              {legendItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border border-white/30"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-white font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#F7FAFC] dark:bg-neutral-900">
          <svg viewBox="0 0 800 500" className="w-full" style={{ height: '550px' }}>
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

              let fillColor = '#e2e8f0';
              let strokeColor = '#cbd5e1';
              let strokeWidth = 0.5;
              let opacity = 0.8;

              if (countryData && countryData.activeWallets > 0) {
                fillColor = getColor(countryData.adoptionRate);
                strokeColor = '#64748b';
                strokeWidth = 1;
                opacity = 0.9;
              }

              const isHovered  = hoveredId  === numericId;
              const isSelected = selectedId === numericId;

              if (isHovered || isSelected) {
                strokeColor = isSelected ? 'var(--brand)' : 'var(--brand-400)';
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
                  onMouseEnter={(e) => handleMouseMove(e, numericId)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleCountryClick(numericId)}
                  className="cursor-pointer transition-all"
                  filter={isHovered || isSelected ? 'url(#world-glow)' : undefined}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {hoveredId && hoveredData && (
        <div
          className="fixed z-50 bg-slate-900/98 backdrop-blur-md border border-[var(--brand)]/50 rounded-lg shadow-lg pointer-events-none transition-all"
          style={{ left: tooltipPos.x + 15, top: tooltipPos.y - 120, minWidth: '650px' }}
        >
          <div className="bg-gradient-to-r from-[var(--brand)]/30 to-[var(--brand-700)]/20 px-4 py-2 border-b border-slate-700">
            <h3 className="font-bold text-[var(--brand-300)] text-lg">{hoveredData.name}</h3>
            <p className="text-xs text-slate-400">{hoveredData.region}</p>
          </div>

          {hoveredData.activeWallets > 0 ? (
            <div className="grid grid-cols-2 divide-x divide-slate-700">
              <div className="px-4 py-3">
                <div className="text-xs font-semibold text-[var(--brand-300)] italic mb-3">Adoption</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">% of population</span>
                    <span className="text-white font-bold text-base">{fmtPct(hoveredData.adoptionRate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Active wallets</span>
                    <span className="text-white font-semibold">{fmtWallets(hoveredData.activeWallets)}</span>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs font-semibold text-[var(--brand-300)] italic mb-3">Economic integration</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Stablecoin TX value share</span>
                    <span className="text-white font-bold text-base">{fmtPct(hoveredData.txValueShare)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 text-xs text-slate-400 italic">No data available for this period</div>
          )}
        </div>
      )}

      {selectedId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setSelectedId(null)}>
          <div className="bg-white dark:bg-neutral-800 border border-[var(--brand)]/30 rounded-xl p-8 max-w-lg w-full mx-4 shadow-lg transition-all" onClick={(e) => e.stopPropagation()}>
            {selectedData ? (
              <>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedData.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{selectedData.region}</p>
                {selectedData.activeWallets > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-[var(--brand-50)] dark:bg-slate-800 rounded-lg">
                      <span className="text-gray-600 dark:text-slate-300">% of population using stablecoins</span>
                      <span className="text-gray-900 dark:text-white font-bold text-xl">{fmtPct(selectedData.adoptionRate)}</span>
                    </div>
                    <div className="border-t border-[var(--brand)]/20 pt-4 space-y-3">
                      <div className="flex justify-between text-gray-600 dark:text-slate-300">
                        <span>Active wallets</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{fmtWallets(selectedData.activeWallets)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-slate-300">
                        <span>Stablecoin TX value share</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{fmtPct(selectedData.txValueShare)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 italic mb-6">No data available for this period</p>
                )}
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Country {selectedId}</h3>
                <p className="text-slate-500 dark:text-slate-400 italic mb-6">No data available</p>
              </>
            )}
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleViewDetails}
                className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-700)] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg"
              >
                View Full Details
              </button>
              <button
                onClick={() => setSelectedId(null)}
                className="px-6 py-3 border border-[var(--brand)]/30 hover:bg-[var(--brand-50)] text-gray-600 dark:text-slate-300 rounded-lg font-semibold transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

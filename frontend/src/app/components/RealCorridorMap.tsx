import { useState, useEffect } from 'react';
import { geoPath, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';

interface BidirectionalCorridor {
  country1: string;
  country2: string;
  valueFromCountry1: number;
  valueFromCountry2: number;
  totalValue: number;
  dollarization: number;
}

interface RealCorridorMapProps {
  corridors: BidirectionalCorridor[];
  getCountryName: (code: string) => string;
}

const countryCodeToId: Record<string, string> = {
  US: '840',
  MX: '484',
  BR: '076',
  AR: '032',
  VE: '862',
  GB: '826',
  FR: '250',
  DE: '276',
  TR: '792',
  NG: '566',
  KE: '404',
  IN: '356',
  CN: '156',
  JP: '392',
  PH: '608',
};

const countryCodeToISO2: Record<string, string> = {
  US: 'us',
  MX: 'mx',
  BR: 'br',
  AR: 'ar',
  VE: 've',
  GB: 'gb',
  FR: 'fr',
  DE: 'de',
  TR: 'tr',
  NG: 'ng',
  KE: 'ke',
  IN: 'in',
  CN: 'cn',
  JP: 'jp',
  PH: 'ph',
};

const countryCentroids: Record<string, [number, number]> = {
  US: [-95, 38],
  MX: [-102, 23],
  BR: [-47, -14],
  AR: [-64, -34],
  VE: [-66, 8],
  GB: [-2, 54],
  FR: [2, 47],
  DE: [10, 51],
  TR: [35, 39],
  NG: [8, 9],
  KE: [38, 1],
  IN: [78, 22],
  CN: [105, 35],
  JP: [138, 36],
  PH: [122, 12],
};

function getStrokeWidth(value: number): number {
  if (value >= 5000000000) return 4;
  if (value >= 2000000000) return 3;
  if (value >= 1000000000) return 2;
  return 1.5;
}

function getCorridorColor(value: number): string {
  if (value >= 5000000000) return '#8b5cf6'; // purple
  if (value >= 2000000000) return '#06b6d4'; // cyan
  if (value >= 1000000000) return '#f59e0b'; // amber
  return '#ec4899'; // pink
}

function formatValue(value: number): string {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
  return `$${value}`;
}

export function RealCorridorMap({ corridors, getCountryName }: RealCorridorMapProps) {
  const [worldData, setWorldData] = useState<any>(null);
  const [hoveredCorridor, setHoveredCorridor] = useState<number | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(res => res.json())
      .then(data => setWorldData(data))
      .catch(err => console.error('Error loading world map:', err));
  }, []);

  // Reset selected corridor if it's filtered out
  useEffect(() => {
    if (selectedCorridor !== null && selectedCorridor >= corridors.length) {
      setSelectedCorridor(null);
    }
  }, [corridors, selectedCorridor]);

  if (!worldData) {
    return (
      <div className="bg-slate-900 rounded-xl border-2 border-slate-700 p-8 flex items-center justify-center" style={{ height: '600px' }}>
        <div className="text-slate-400">Loading world map...</div>
      </div>
    );
  }

  const projection = geoMercator()
    .scale(140)
    .translate([800 / 2, 500 / 2]);

  const pathGenerator = geoPath().projection(projection);
  const geojson = feature(worldData, worldData.objects.countries);

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    setHoveredCorridor(index);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const hoveredData = hoveredCorridor !== null ? corridors[hoveredCorridor] : null;
  const selectedData = selectedCorridor !== null ? corridors[selectedCorridor] : null;

  const legendItems = [
    { label: '<$1B', width: 1.5, color: '#ec4899' },
    { label: '$1-2B', width: 2, color: '#f59e0b' },
    { label: '$2-5B', width: 3, color: '#06b6d4' },
    { label: '$5B+', width: 4, color: '#8b5cf6' },
  ];

  return (
    <div className="relative">
      <div className="bg-white dark:bg-neutral-800 rounded-xl border-2 border-slate-300 dark:border-neutral-700 overflow-hidden shadow-lg transition-colors">
        <div className="p-4 border-b-2 border-slate-300 dark:border-neutral-700 flex justify-between items-center" style={{ backgroundColor: '#214A9A' }}>
          <div className="flex items-center gap-6">
            <span className="text-sm text-white font-medium">Transfer volume (line thickness)</span>
            <div className="flex items-center gap-4">
              {legendItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <svg width="30" height="12">
                    <line
                      x1="0"
                      y1="6"
                      x2="30"
                      y2="6"
                      stroke={item.color}
                      strokeWidth={item.width}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-xs text-white">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#F7FAFC] dark:bg-neutral-900">
          <svg viewBox="0 0 800 500" className="w-full" style={{ height: '550px' }}>
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

            {corridors.map((corridor, index) => {
              const fromCoords = countryCentroids[corridor.country1];
              const toCoords = countryCentroids[corridor.country2];
              if (!fromCoords || !toCoords) return null;

              const fromPoint = projection(fromCoords);
              const toPoint = projection(toCoords);
              if (!fromPoint || !toPoint) return null;

              const isHovered = hoveredCorridor === index;
              const isSelected = selectedCorridor === index;
              const strokeWidth = getStrokeWidth(corridor.totalValue);
              const corridorColor = getCorridorColor(corridor.totalValue);

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
                  stroke={isHovered || isSelected ? '#fff' : corridorColor}
                  strokeWidth={isHovered || isSelected ? strokeWidth + 1.5 : strokeWidth}
                  fill="none"
                  opacity={isHovered || isSelected ? 1 : 0.8}
                  onMouseEnter={(e) => handleMouseMove(e, index)}
                  onMouseLeave={() => setHoveredCorridor(null)}
                  onClick={() => setSelectedCorridor(index)}
                  className="cursor-pointer transition-all"
                  filter={isHovered || isSelected ? 'url(#corridor-glow)' : undefined}
                  strokeLinecap="round"
                />
              );
            })}

            {Object.entries(countryCentroids).map(([code, coords]) => {
              const point = projection(coords);
              if (!point) return null;
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
          className="fixed z-50 bg-slate-900/98 backdrop-blur-md border-2 border-cyan-500/50 rounded-lg shadow-2xl pointer-events-none"
          style={{ left: tooltipPos.x + 15, top: tooltipPos.y - 100, minWidth: '500px' }}
        >
          <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 px-4 py-2 border-b border-slate-700">
            <h3 className="font-bold text-cyan-400 text-lg text-center">
              {getCountryName(hoveredData.country1)} &lt;-&gt; {getCountryName(hoveredData.country2)}
            </h3>
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="bg-slate-800/50 p-2 text-left"></th>
                  <th className="bg-slate-800/50 p-2 text-center text-cyan-400 italic font-semibold border-l border-slate-700">
                    {getCountryName(hoveredData.country1)} -&gt; {getCountryName(hoveredData.country2)}
                  </th>
                  <th className="bg-slate-800/50 p-2 text-center text-cyan-400 italic font-semibold border-l border-slate-700">
                    {getCountryName(hoveredData.country2)} -&gt; {getCountryName(hoveredData.country1)}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700">
                  <td className="p-2 text-slate-300 bg-slate-800/30">Stablecoin value</td>
                  <td className="p-2 text-center text-white font-bold border-l border-slate-700">
                    {formatValue(hoveredData.valueFromCountry1)}
                  </td>
                  <td className="p-2 text-center text-white font-bold border-l border-slate-700">
                    {formatValue(hoveredData.valueFromCountry2)}
                  </td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td rowSpan={4} className="p-2 text-slate-300 bg-slate-800/30 align-top">
                    <div>Stablecoin share (%)</div>
                  </td>
                  <td className="p-2 border-l border-slate-700 bg-slate-800/20">
                    <div className="flex justify-between">
                      <span className="text-slate-400 italic">USDT</span>
                      <span className="text-white font-semibold">49%</span>
                    </div>
                  </td>
                  <td className="p-2 border-l border-slate-700 bg-slate-800/20">
                    <div className="flex justify-between">
                      <span className="text-slate-400 italic">USDT</span>
                      <span className="text-white font-semibold">54%</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td className="p-2 border-l border-slate-700 bg-slate-800/20">
                    <div className="flex justify-between">
                      <span className="text-slate-400 italic">USDC</span>
                      <span className="text-white font-semibold">35%</span>
                    </div>
                  </td>
                  <td className="p-2 border-l border-slate-700 bg-slate-800/20">
                    <div className="flex justify-between">
                      <span className="text-slate-400 italic">USDC</span>
                      <span className="text-white font-semibold">31%</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td className="p-2 border-l border-slate-700 bg-slate-800/20">
                    <div className="flex justify-between">
                      <span className="text-slate-400 italic">DAI</span>
                      <span className="text-white font-semibold">10%</span>
                    </div>
                  </td>
                  <td className="p-2 border-l border-slate-700 bg-slate-800/20">
                    <div className="flex justify-between">
                      <span className="text-slate-400 italic">DAI</span>
                      <span className="text-white font-semibold">8%</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border-l border-slate-700 bg-slate-800/20">
                    <div className="flex justify-between">
                      <span className="text-slate-400 italic">Other</span>
                      <span className="text-white font-semibold">6%</span>
                    </div>
                  </td>
                  <td className="p-2 border-l border-slate-700 bg-slate-800/20">
                    <div className="flex justify-between">
                      <span className="text-slate-400 italic">Other</span>
                      <span className="text-white font-semibold">7%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setSelectedCorridor(null)}>
          <div className="bg-slate-900 border-2 border-slate-700 rounded-xl p-8 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-6">Corridor Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-800 rounded-lg">
                <span className="text-slate-300">Route</span>
                <span className="text-white font-bold">{getCountryName(selectedData.country1)} ⟷ {getCountryName(selectedData.country2)}</span>
              </div>
              <div className="border-t border-slate-700 pt-4 space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Total corridor value (bidirectional)</span>
                  <span className="text-cyan-400 font-bold text-xl">{formatValue(selectedData.totalValue)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col p-3 bg-slate-800/30 rounded">
                    <span className="text-xs text-slate-400">{getCountryName(selectedData.country1)} → {getCountryName(selectedData.country2)}</span>
                    <span className="text-white font-semibold mt-1">{formatValue(selectedData.valueFromCountry1)}</span>
                  </div>
                  <div className="flex flex-col p-3 bg-slate-800/30 rounded">
                    <span className="text-xs text-slate-400">{getCountryName(selectedData.country2)} → {getCountryName(selectedData.country1)}</span>
                    <span className="text-white font-semibold mt-1">{formatValue(selectedData.valueFromCountry2)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Dollarization index</span>
                  <span className="font-semibold text-white">{(selectedData.dollarization * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedCorridor(null)}
              className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

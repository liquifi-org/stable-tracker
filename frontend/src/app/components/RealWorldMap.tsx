import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { geoPath, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';

interface Country {
  code: string;
  name: string;
  adoption: number;
  wallets: number;
  txPercentage: number;
}

interface RealWorldMapProps {
  countries: Country[];
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

function getColor(adoption: number): string {
  if (adoption < 8) return '#D1FAE5';
  if (adoption < 16) return '#6EE7B7';
  if (adoption < 24) return '#34D399';
  if (adoption < 32) return '#10B981';
  return '#047857';
}

export function RealWorldMap({ countries }: RealWorldMapProps) {
  const [worldData, setWorldData] = useState<any>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(res => res.json())
      .then(data => {
        setWorldData(data);
      })
      .catch(err => console.error('Error loading world map:', err));
  }, []);

  // Reset selected country if it's filtered out
  useEffect(() => {
    if (selectedCountry && !countries.find(c => c.code === selectedCountry)) {
      setSelectedCountry(null);
    }
  }, [countries, selectedCountry]);

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

  const countryDataMap = new Map(
    countries.map(c => [countryCodeToId[c.code], c])
  );

  const handleCountryClick = (countryCode: string) => {
    setSelectedCountry(countryCode);
  };

  const handleViewDetails = () => {
    if (selectedCountry) {
      navigate(`/country/${selectedCountry}`);
      setSelectedCountry(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent, countryCode: string) => {
    setHoveredCountry(countryCode);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const hoveredData = hoveredCountry ? countryDataMap.get(countryCodeToId[hoveredCountry]) : null;
  const selectedData = selectedCountry ? countryDataMap.get(countryCodeToId[selectedCountry]) : null;

  const legendItems = [
    { min: '0%', max: '7%', color: '#D1FAE5' },
    { min: '8%', max: '15%', color: '#6EE7B7' },
    { min: '16%', max: '23%', color: '#34D399' },
    { min: '24%', max: '31%', color: '#10B981' },
    { min: '32%', max: '+', color: '#047857' },
  ];

  return (
    <div className="relative">
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/50 dark:border-neutral-700 overflow-hidden shadow-md transition-all">
        <div className="p-6 border-b border-slate-200/50 dark:border-neutral-700" style={{ backgroundColor: 'var(--brand)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white font-medium">% Population using stablecoins</span>
            <div className="flex items-center gap-4">
              {legendItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border-2 border-white/30"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-white font-medium">
                    {item.min} - {item.max}
                  </span>
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
              const countryId = geo.id;
              const countryData = Array.from(countryDataMap.entries()).find(([id]) => id === countryId)?.[1];

              let fillColor = '#e2e8f0';
              let strokeColor = '#cbd5e1';
              let strokeWidth = 0.5;
              let opacity = 0.8;

              if (countryData) {
                fillColor = getColor(countryData.adoption);
                strokeColor = '#64748b';
                strokeWidth = 1;
                opacity = 0.9;
              }

              const isHovered = hoveredCountry === countryData?.code;
              const isSelected = selectedCountry === countryData?.code;

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
                  onMouseEnter={countryData ? (e) => handleMouseMove(e, countryData.code) : undefined}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onClick={countryData ? () => handleCountryClick(countryData.code) : undefined}
                  className={countryData ? 'cursor-pointer transition-all duration-300' : 'pointer-events-none'}
                  filter={isHovered || isSelected ? 'url(#world-glow)' : undefined}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {hoveredData && (
        <div
          className="fixed z-50 bg-slate-900/98 backdrop-blur-md border border-[var(--brand)]/50 rounded-lg shadow-lg pointer-events-none transition-all"
          style={{ left: tooltipPos.x + 15, top: tooltipPos.y - 120, minWidth: '650px' }}
        >
          <div className="bg-gradient-to-r from-[var(--brand)]/30 to-[var(--brand-700)]/20 px-4 py-2 border-b border-slate-700">
            <h3 className="font-bold text-[var(--brand-300)] text-lg">{hoveredData.name}</h3>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-700">
            <div className="px-4 py-3">
              <div className="text-xs font-semibold text-[var(--brand-300)] italic mb-3">Adoption</div>
              <div className="space-y-2">
                <div className="text-slate-300 text-xs">% of population using stablecoins</div>
                <div className="text-white font-bold text-xl mb-3">{hoveredData.adoption}%</div>

                <div className="space-y-1.5 text-xs border-t border-slate-700 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">USDT</span>
                    <div className="text-slate-200">
                      <span className="font-semibold">52%</span>
                      <span className="text-slate-500 ml-1">(${(hoveredData.wallets * 0.52 / 1000000).toFixed(0)}m)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">USDC</span>
                    <div className="text-slate-200">
                      <span className="font-semibold">31%</span>
                      <span className="text-slate-500 ml-1">(${(hoveredData.wallets * 0.31 / 1000000).toFixed(0)}m)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">DAI</span>
                    <div className="text-slate-200">
                      <span className="font-semibold">12%</span>
                      <span className="text-slate-500 ml-1">(${(hoveredData.wallets * 0.12 / 1000000).toFixed(0)}m)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="text-xs font-semibold text-[var(--brand-300)] italic mb-3">Regulation</div>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-slate-400 mb-1">Compliant issuers</div>
                  <ul className="text-slate-200 space-y-0.5">
                    <li>• Circle</li>
                    <li>• Paxos</li>
                    <li>• Tether</li>
                  </ul>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Compliant reserve types</div>
                  <ul className="text-slate-200 space-y-0.5">
                    <li>• Fiat</li>
                    <li>• T-Bills</li>
                  </ul>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Key license/law</div>
                  <div className="text-slate-200">Pending</div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="text-xs font-semibold text-[var(--brand-300)] italic mb-3">Economic integration & currency sovereignty</div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-slate-300">Stablecoin transactions as % of total transactions</div>
                  <div className="text-white font-bold text-lg mt-1">{hoveredData.txPercentage}%</div>
                </div>
                <div>
                  <div className="text-slate-300">Dollarization index</div>
                  <div className="text-white font-bold text-lg mt-1">
                    {((hoveredData.adoption / 100) * 80).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setSelectedCountry(null)}>
          <div className="bg-white dark:bg-neutral-800 border border-[var(--brand)]/30 rounded-xl p-8 max-w-lg w-full mx-4 shadow-lg transition-all" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{selectedData.name}</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-[var(--brand-50)] dark:bg-slate-800 rounded-lg">
                <span className="text-gray-600 dark:text-slate-300">Population using stablecoins</span>
                <span className="text-gray-900 dark:text-white font-bold text-xl">{selectedData.adoption}%</span>
              </div>
              <div className="border-t border-[var(--brand)]/20 pt-4 space-y-3">
                <div className="flex justify-between text-gray-600 dark:text-slate-300">
                  <span>Active wallets</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{(selectedData.wallets / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-slate-300">
                  <span>TX percentage</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedData.txPercentage}%</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleViewDetails}
                className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-700)] text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg"
              >
                View Full Details
              </button>
              <button
                onClick={() => setSelectedCountry(null)}
                className="px-6 py-3 border-2 border-[var(--brand)]/30 hover:bg-[var(--brand-50)] text-gray-600 dark:text-slate-300 rounded-lg font-semibold transition-colors"
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

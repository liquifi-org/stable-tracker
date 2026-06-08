export const countries = [
  { code: 'US', name: 'United States', adoption: 12.5, wallets: 42000000, txPercentage: 8.3, region: 'North America' },
  { code: 'BR', name: 'Brazil', adoption: 18.2, wallets: 38000000, txPercentage: 15.6, region: 'South America' },
  { code: 'AR', name: 'Argentina', adoption: 28.4, wallets: 12500000, txPercentage: 32.1, region: 'South America' },
  { code: 'MX', name: 'Mexico', adoption: 15.7, wallets: 20000000, txPercentage: 12.4, region: 'North America' },
  { code: 'NG', name: 'Nigeria', adoption: 35.2, wallets: 72000000, txPercentage: 41.8, region: 'Africa' },
  { code: 'KE', name: 'Kenya', adoption: 22.1, wallets: 12000000, txPercentage: 28.5, region: 'Africa' },
  { code: 'IN', name: 'India', adoption: 8.4, wallets: 118000000, txPercentage: 6.2, region: 'Asia' },
  { code: 'CN', name: 'China', adoption: 5.2, wallets: 74000000, txPercentage: 3.8, region: 'Asia' },
  { code: 'JP', name: 'Japan', adoption: 6.8, wallets: 8600000, txPercentage: 5.1, region: 'Asia' },
  { code: 'TR', name: 'Turkey', adoption: 31.5, wallets: 26500000, txPercentage: 38.2, region: 'Europe' },
  { code: 'DE', name: 'Germany', adoption: 4.2, wallets: 3500000, txPercentage: 2.8, region: 'Europe' },
  { code: 'FR', name: 'France', adoption: 3.8, wallets: 2500000, txPercentage: 2.1, region: 'Europe' },
  { code: 'GB', name: 'United Kingdom', adoption: 5.5, wallets: 3700000, txPercentage: 3.9, region: 'Europe' },
  { code: 'VE', name: 'Venezuela', adoption: 42.6, wallets: 12000000, txPercentage: 68.4, region: 'South America' },
  { code: 'PH', name: 'Philippines', adoption: 19.3, wallets: 21000000, txPercentage: 16.8, region: 'Asia' },
];

export const corridors = [
  { from: 'US', to: 'MX', value: 8500000000, dollarization: 0.42 },
  { from: 'US', to: 'BR', value: 3200000000, dollarization: 0.28 },
  { from: 'US', to: 'PH', value: 2800000000, dollarization: 0.35 },
  { from: 'US', to: 'IN', value: 5100000000, dollarization: 0.18 },
  { from: 'US', to: 'CN', value: 1800000000, dollarization: 0.12 },
  { from: 'US', to: 'JP', value: 1650000000, dollarization: 0.15 },
  { from: 'US', to: 'GB', value: 2100000000, dollarization: 0.08 },
  { from: 'US', to: 'AR', value: 920000000, dollarization: 0.48 },
  { from: 'MX', to: 'US', value: 1200000000, dollarization: 0.42 },
  { from: 'MX', to: 'BR', value: 450000000, dollarization: 0.32 },
  { from: 'MX', to: 'AR', value: 280000000, dollarization: 0.38 },
  { from: 'BR', to: 'AR', value: 1800000000, dollarization: 0.52 },
  { from: 'BR', to: 'US', value: 890000000, dollarization: 0.28 },
  { from: 'BR', to: 'MX', value: 320000000, dollarization: 0.32 },
  { from: 'BR', to: 'PH', value: 180000000, dollarization: 0.22 },
  { from: 'AR', to: 'BR', value: 900000000, dollarization: 0.58 },
  { from: 'AR', to: 'US', value: 420000000, dollarization: 0.48 },
  { from: 'AR', to: 'MX', value: 190000000, dollarization: 0.38 },
  { from: 'AR', to: 'VE', value: 240000000, dollarization: 0.72 },
  { from: 'NG', to: 'KE', value: 450000000, dollarization: 0.65 },
  { from: 'NG', to: 'GB', value: 680000000, dollarization: 0.42 },
  { from: 'NG', to: 'US', value: 520000000, dollarization: 0.55 },
  { from: 'NG', to: 'IN', value: 290000000, dollarization: 0.38 },
  { from: 'KE', to: 'NG', value: 320000000, dollarization: 0.58 },
  { from: 'KE', to: 'GB', value: 410000000, dollarization: 0.35 },
  { from: 'KE', to: 'US', value: 380000000, dollarization: 0.42 },
  { from: 'GB', to: 'IN', value: 1900000000, dollarization: 0.22 },
  { from: 'GB', to: 'US', value: 1200000000, dollarization: 0.08 },
  { from: 'GB', to: 'NG', value: 490000000, dollarization: 0.42 },
  { from: 'GB', to: 'PH', value: 820000000, dollarization: 0.28 },
  { from: 'DE', to: 'TR', value: 780000000, dollarization: 0.48 },
  { from: 'DE', to: 'US', value: 920000000, dollarization: 0.06 },
  { from: 'TR', to: 'DE', value: 420000000, dollarization: 0.48 },
  { from: 'TR', to: 'GB', value: 350000000, dollarization: 0.38 },
  { from: 'TR', to: 'US', value: 580000000, dollarization: 0.32 },
  { from: 'CN', to: 'US', value: 2100000000, dollarization: 0.15 },
  { from: 'CN', to: 'JP', value: 780000000, dollarization: 0.12 },
  { from: 'CN', to: 'PH', value: 650000000, dollarization: 0.18 },
  { from: 'JP', to: 'US', value: 1400000000, dollarization: 0.12 },
  { from: 'JP', to: 'CN', value: 590000000, dollarization: 0.12 },
  { from: 'JP', to: 'PH', value: 720000000, dollarization: 0.22 },
  { from: 'VE', to: 'US', value: 890000000, dollarization: 0.85 },
  { from: 'VE', to: 'AR', value: 180000000, dollarization: 0.78 },
  { from: 'VE', to: 'BR', value: 150000000, dollarization: 0.68 },
  { from: 'PH', to: 'US', value: 1050000000, dollarization: 0.35 },
  { from: 'PH', to: 'JP', value: 420000000, dollarization: 0.22 },
  { from: 'PH', to: 'CN', value: 380000000, dollarization: 0.18 },
  { from: 'IN', to: 'US', value: 2400000000, dollarization: 0.18 },
  { from: 'IN', to: 'GB', value: 1100000000, dollarization: 0.22 },
  { from: 'IN', to: 'PH', value: 290000000, dollarization: 0.25 },
];

export const countryDetails: Record<string, {
  adoption: number;
  txValue: number;
  dollarization: number;
  compliantIssuers: string[];
  licenses: string[];
  reserveTypes: string[];
  economicIntegration: string;
  currencySovereignty: string;
}> = {
  US: {
    adoption: 12.5,
    txValue: 8.3,
    dollarization: 0.05,
    compliantIssuers: ['Circle', 'Paxos', 'Gemini'],
    licenses: ['Money Transmitter License', 'Trust Charter'],
    reserveTypes: ['Cash', 'T-Bills', 'Money Market Funds'],
    economicIntegration: 'High integration with traditional financial system',
    currencySovereignty: 'Strong sovereign currency (USD)',
  },
  AR: {
    adoption: 28.4,
    txValue: 32.1,
    dollarization: 0.58,
    compliantIssuers: ['Tether', 'Circle'],
    licenses: ['Under Development - Regulatory Framework'],
    reserveTypes: ['USD Cash', 'Foreign Reserves'],
    economicIntegration: 'Moderate integration, parallel economy',
    currencySovereignty: 'Weak peso, high USD preference',
  },
  NG: {
    adoption: 35.2,
    txValue: 41.8,
    dollarization: 0.62,
    compliantIssuers: ['Tether', 'Binance USD'],
    licenses: ['SEC Registration Required'],
    reserveTypes: ['USD', 'Multi-currency'],
    economicIntegration: 'Growing parallel economy',
    currencySovereignty: 'Naira under pressure',
  },
};

export function getCountryName(code: string): string {
  return countries.find(c => c.code === code)?.name || code;
}

export function getCountryData(code: string) {
  const baseData = countries.find(c => c.code === code);
  const details = countryDetails[code] || {
    adoption: baseData?.adoption || 0,
    txValue: baseData?.txPercentage || 0,
    dollarization: 0.25,
    compliantIssuers: ['Various'],
    licenses: ['Pending Regulatory Clarity'],
    reserveTypes: ['Mixed'],
    economicIntegration: 'Emerging',
    currencySovereignty: 'Moderate',
  };
  return { ...baseData, ...details };
}

export function getCorridorsForCountry(code: string) {
  const outflows = corridors.filter(c => c.from === code);
  const inflows = corridors.filter(c => c.to === code);
  return { outflows, inflows };
}

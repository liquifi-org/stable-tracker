const BASE_URL = 'http://localhost:3003/v1';

/** ISO alpha-2 → ISO numeric mapping for countries present in the app */
export const ALPHA2_TO_NUMERIC: Record<string, number> = {
  US: 840,
  BR: 76,
  AR: 32,
  MX: 484,
  NG: 566,
  KE: 404,
  IN: 356,
  CN: 156,
  JP: 392,
  TR: 792,
  DE: 276,
  FR: 250,
  GB: 826,
  VE: 862,
  PH: 608,
};

/** ISO numeric (string) → ISO alpha-2, for backwards-compatible navigation */
export const NUMERIC_TO_ALPHA2: Record<string, string> = Object.fromEntries(
  Object.entries(ALPHA2_TO_NUMERIC).map(([alpha2, numeric]) => [String(numeric), alpha2])
);

export interface ApiCountry {
  id: number;
  name: string;
  stage: number;
  isStablecoinSpecific?: number;
  fiatBacked?: number;
  fiatAlert?: string | null;
  cryptoBacked?: number;
  cryptoAlert?: string | null;
  commodityBacked?: number;
  commodityAlert?: string | null;
  algorithmBacked?: number;
  algorithmAlert?: string | null;
  currency?: string;
  regulatorName?: string;
  regulatorDescription?: string;
  description?: string;
}

export interface ApiIssuer {
  id: number;
  name: string;
  officialName?: string;
}

export interface ApiLicense {
  licenseId: string;
  name: string;
  type: string;
  countryId: string;
}

export interface ApiReserveType {
  id: number;
  name: string;
  type?: string;
}

export interface CountryAdoptionMetric {
  countryId: string;
  name: string;
  region: string;
  adoptionRate: number;
  activeWallets: number;
  txValueShare: number;
  unit?: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getCountry: (numericId: number) =>
    fetchJson<ApiCountry>(`/countries/${numericId}`),

  getCountryIssuers: (numericId: number) =>
    fetchJson<ApiIssuer[]>(`/countries/${numericId}/regulated-issuers`),

  getCountryLicenses: (numericId: number) =>
    fetchJson<ApiLicense[]>(`/countries/${numericId}/licenses`),

  getCountryReserveTypes: (numericId: number) =>
    fetchJson<ApiReserveType[]>(`/countries/${numericId}/regulated-reserve-types`),

  getAdoptionAnalytics: (year: number, month?: number) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    return fetchJson<CountryAdoptionMetric[]>(`/analytics/adoption?${params}`);
  },
};

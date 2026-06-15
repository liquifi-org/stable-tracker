const BASE_URL = 'http://localhost:3003/v1';

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
  isoAlpha2: string;
  name: string;
  region: string;
  adoptionRate: number;
  activeWallets: number;
  txValueShare: number;
  unit?: string;
  remittancesSent?: number;
}

export interface StablecoinShare {
  stablecoinId: string;
  name: string;
  share: number;
}

export interface CorridorFlow {
  from: string;
  to: string;
  value: { amount: number; currency: string };
  dollarizationIndex: number;
  topStablecoins?: StablecoinShare[];
}

export interface CountryCorridorFlow {
  from: string;
  to: string;
  fromName?: string;
  toName?: string;
  value: { amount: number; currency: string };
  dollarizationIndex: number;
}

export interface CountryCorridorBreakdown {
  countryId: string;
  inflows: CountryCorridorFlow[];
  outflows: CountryCorridorFlow[];
}

export interface CountryOverview {
  countryId: string;
  name: string;
  region: string;
  adoptionRate: number;
  activeWallets: number;
  txValueShare: number;
  dollarizationIndex: number;
}

/** Resolve a country URL param (numeric string or alpha-2) to an integer numeric ID. */
export function resolveToNumericId(code: string): number | null {
  if (/^\d+$/.test(code)) return parseInt(code, 10);
  const TABLE: Record<string, number> = {
    US:840, BR:76, AR:32, MX:484, NG:566, KE:404, IN:356, CN:156, JP:392,
    TR:792, DE:276, FR:250, GB:826, VE:862, PH:608, AU:36, AT:40, TW:158,
    ID:360, KR:410, NL:528, ZA:710, UA:804, IR:364,
  };
  return TABLE[code.toUpperCase()] ?? null;
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

  getCorridors: (year: number, month?: number, regionFrom?: string, regionTo?: string) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    if (regionFrom && regionFrom !== 'All') params.set('regionFrom', regionFrom);
    if (regionTo && regionTo !== 'All') params.set('regionTo', regionTo);
    return fetchJson<CorridorFlow[]>(`/analytics/corridors?${params}`);
  },

  getCountryOverview: (numericId: number, year: number, month?: number) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    return fetchJson<CountryOverview>(`/analytics/countries/${numericId}/overview?${params}`);
  },

  getCountryCorridors: (numericId: number, year: number, month?: number) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    return fetchJson<CountryCorridorBreakdown>(`/analytics/countries/${numericId}/corridors?${params}`);
  },
};

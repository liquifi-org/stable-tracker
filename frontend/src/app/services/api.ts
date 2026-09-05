import { prettyCountryName, resolveCountryNumericId, shortCountryName } from '../lib/countryRoutes';

const BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? 'http://localhost:3003/v1' : '/v1');

export interface ApiCountry {
  id: number;
  name: string;
  region?: string;
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
  issuerId: string;
  name: string;
  originCountry: string;
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
  macroRegion: string | null;
  adoptionRate: number;
  activeWallets: number;
  txValueShare: number;
  unit?: string;
  remittancesSent?: number;
  adoptionRank: number | null;
  eligibleCountries: number;
  relativeAdoptionIndex: number | null;
}

export interface RegionalAdoptionMetric {
  region: string;
  countryCount: number;
  activeWallets: number;
  population: number;
  adoptionRate: number;
  txValueShare: number;
  unit?: string;
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
  isoAlpha2: string;
  name: string;
  region: string;
  adoptionRate: number;
  activeWallets: number;
  txValueShare: number;
  dollarizationIndex: number;
  adoptionRank: number | null;
  eligibleCountries: number;
}

export interface CountryRegulationInfo {
  countryId: string;
  isoAlpha2?: string;
  name: string;
  region: string;
  stage?: number;
  regulatorName?: string;
  regulatorDescription?: string;
  description?: string;
  currency?: string;
  fiatBacked?: number;
  fiatAlert?: string;
  cryptoBacked?: number;
  cryptoAlert?: string;
  commodityBacked?: number;
  commodityAlert?: string;
  algorithmBacked?: number;
  algorithmAlert?: string;
  isStablecoinSpecific?: number;
}

export interface GlobalInsights {
  totalActiveWallets: number;
  liveRegulationCountries: number;
  totalTxValueUsd: number;
  totalRemittancesUsd: number;
}

export interface ExchangeRate {
  referenceAsset: string;
  currencyOriginal: string;
  usdExchangeRate: number;
  date: string;
}

export interface CountryPage<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
}

/** Resolve a country slug (japan) or ISO code to the numeric id used by the API. */
export function resolveToNumericId(code: string): number | null {
  return resolveCountryNumericId(code);
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function withPrettyName<T extends { name: string; countryId?: string; isoAlpha2?: string; id?: number }>(row: T): T {
  const countryId = row.countryId ?? (row.id != null ? String(row.id) : undefined);
  const name = prettyCountryName({ name: row.name, countryId, isoAlpha2: row.isoAlpha2 });
  return name ? { ...row, name } : row;
}

function withPrettyPartnerNames(flow: CountryCorridorFlow): CountryCorridorFlow {
  return {
    ...flow,
    fromName: flow.fromName
      ? prettyCountryName({ name: flow.fromName, countryId: flow.from }) || shortCountryName(flow.fromName)
      : flow.fromName,
    toName: flow.toName
      ? prettyCountryName({ name: flow.toName, countryId: flow.to }) || shortCountryName(flow.toName)
      : flow.toName,
  };
}

export const api = {
  getCountry: async (numericId: number) =>
    withPrettyName(await fetchJson<ApiCountry>(`/countries/${numericId}`)),

  getCountryIssuers: (numericId: number) =>
    fetchJson<ApiIssuer[]>(`/countries/${numericId}/regulated-issuers`),

  getCountryLicenses: (numericId: number) =>
    fetchJson<ApiLicense[]>(`/countries/${numericId}/licenses`),

  getCountryReserveTypes: (numericId: number) =>
    fetchJson<ApiReserveType[]>(`/countries/${numericId}/regulated-reserve-types`),

  getAdoptionAnalytics: (year: number, month?: number) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    return fetchJson<CountryAdoptionMetric[]>(`/analytics/adoption?${params}`).then((rows) =>
      rows.map(withPrettyName),
    );
  },

  getRegionalAdoptionAnalytics: (year: number, month?: number) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    return fetchJson<RegionalAdoptionMetric[]>(`/analytics/adoption/regions?${params}`);
  },

  getCorridors: (
    year: number,
    month?: number,
    opts?: { regionFrom?: string; regionTo?: string; stablecoinId?: string; referenceAsset?: string }
  ) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    if (opts?.regionFrom && opts.regionFrom !== 'All') params.set('regionFrom', opts.regionFrom);
    if (opts?.regionTo && opts.regionTo !== 'All') params.set('regionTo', opts.regionTo);
    if (opts?.stablecoinId && opts.stablecoinId !== 'All') params.set('stablecoinId', opts.stablecoinId);
    if (opts?.referenceAsset && opts.referenceAsset !== 'All') params.set('referenceAsset', opts.referenceAsset);
    return fetchJson<CorridorFlow[]>(`/analytics/corridors?${params}`);
  },

  getCorridorStablecoins: (year: number, month?: number) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    return fetchJson<string[]>(`/analytics/corridors/stablecoins?${params}`);
  },

  getCountryOverview: (numericId: number, year: number, month?: number) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    return fetchJson<CountryOverview>(`/analytics/countries/${numericId}/overview?${params}`).then(withPrettyName);
  },

  getCountryCorridors: (numericId: number, year: number, month?: number) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    return fetchJson<CountryCorridorBreakdown>(`/analytics/countries/${numericId}/corridors?${params}`).then(
      (data) => ({
        ...data,
        inflows: data.inflows.map(withPrettyPartnerNames),
        outflows: data.outflows.map(withPrettyPartnerNames),
      }),
    );
  },

  getCountriesRegulation: () =>
    fetchJson<CountryPage<CountryRegulationInfo>>('/countries?pageSize=200').then((page) => ({
      ...page,
      items: page.items.map(withPrettyName),
    })),

  getGlobalInsights: (year: number, month?: number) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) params.set('month', String(month));
    return fetchJson<GlobalInsights>(`/analytics/global-insights?${params}`);
  },

  /** Average EUR/USD rate stored for the given month (see backend/script/general/sync-exchange-rates.ts). */
  getExchangeRate: async (year: number, month: number): Promise<number | null> => {
    const date = `${year}-${String(month).padStart(2, '0')}-01`;
    const params = new URLSearchParams({
      dateFrom: date,
      dateTo: date,
      currencyOriginal: 'EUR',
      referenceAsset: 'USD',
      pageSize: '1',
    });
    const page = await fetchJson<CountryPage<ExchangeRate>>(`/exchange-rates?${params}`);
    return page.items[0]?.usdExchangeRate ?? null;
  },
};

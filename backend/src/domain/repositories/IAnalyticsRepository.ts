import type { ReserveTypeCodeValue } from '../value-objects/ReserveTypeCode';

export interface AdoptionParams {
    year: number;
    month?: number;
    referenceAsset?: string;
    stablecoinId?: string;
    countryId?: string;
    region?: string;
}

export interface CorridorParams {
    year: number;
    month?: number;
    referenceAsset?: string;
    stablecoinId?: string;
    countryId?: string;
    regionFrom?: string;
    regionTo?: string;
    bidirectional?: boolean;
}

export interface CountryOverviewParams {
    countryId: string;
    year: number;
    month?: number;
    referenceAsset?: string;
}

export interface CountryCorridorsParams {
    countryId: string;
    year: number;
    month?: number;
    referenceAsset?: string;
    direction?: 'inflow' | 'outflow' | 'both';
    topStablecoins?: number;
}

export interface CountryAdoptionMetric {
    countryId: string;
    isoAlpha2: string;
    name: string;
    region: string;
    /** Macro-region bucket (APAC / Americas / EMEIA), or null if the country's region is unmapped. */
    macroRegion: string | null;
    adoptionRate: number;
    activeWallets: number;
    txValueShare: number;
    unit: 'ratio' | 'percent';
    remittancesSent?: number;
    /** 1-based rank among eligible geographies (> 10k wallets holding stablecoins), by adoptionRate desc. Null when not eligible. */
    adoptionRank: number | null;
    /** Size of the eligible geography set used for ranking. */
    eligibleCountries: number;
    /** Rank-normalized adoption score in [0,1]: 1 = rank 1 (highest), 0 = lowest rank. Null when not eligible. */
    relativeAdoptionIndex: number | null;
}

export interface RegionalAdoptionMetric {
    /** Macro-region bucket: 'APAC' | 'Americas' | 'EMEIA'. */
    region: string;
    countryCount: number;
    activeWallets: number;
    population: number;
    adoptionRate: number;
    txValueShare: number;
    unit: 'ratio' | 'percent';
}

export interface StablecoinShare {
    stablecoinId: string;
    name: string;
    share: number;
}

export interface CorridorFlow {
    from: string;
    to: string;
    fromName?: string;
    toName?: string;
    value: { amount: number; currency: string };
    dollarizationIndex: number;
    topStablecoins?: StablecoinShare[];
}

export interface BidirectionalCorridorFlow {
    country1: string;
    country2: string;
    valueFromCountry1: { amount: number; currency: string };
    valueFromCountry2: { amount: number; currency: string };
    totalValue: { amount: number; currency: string };
    dollarizationIndex: number;
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
    /** 1-based rank among eligible geographies (> 10k wallets holding stablecoins), by adoptionRate desc. Null when not eligible. */
    adoptionRank: number | null;
    /** Size of the eligible geography set used for ranking. */
    eligibleCountries: number;
    compliantIssuers: { issuerId: string; name: string; originCountry: string }[];
    licenses: { licenseId: string; name: string; type: string; countryId: string }[];
    reserveTypes: { reserveType: ReserveTypeCodeValue; description?: string }[];
    economicIntegration?: string;
    currencySovereignty?: string;
}

export interface CountryCorridorBreakdown {
    countryId: string;
    inflows: CorridorFlow[];
    outflows: CorridorFlow[];
}

export interface GlobalInsightsParams {
    year: number;
    month?: number;
}

export interface GlobalInsightsMetric {
    totalActiveWallets: number;
    /** Countries whose regulatory stage is "Live" (3), independent of the reporting period. */
    liveRegulationCountries: number;
    totalTxValueUsd: number;
    totalRemittancesUsd: number;
}

export interface CorridorStablecoinsParams {
    year: number;
    month?: number;
}

export interface IAnalyticsRepository {
    getAdoptionMetrics(params: AdoptionParams): Promise<CountryAdoptionMetric[]>;
    getRegionalAdoptionMetrics(params: AdoptionParams): Promise<RegionalAdoptionMetric[]>;
    getCorridorFlows(
        params: CorridorParams,
    ): Promise<CorridorFlow[] | BidirectionalCorridorFlow[]>;
    getCountryOverview(params: CountryOverviewParams): Promise<CountryOverview | null>;
    getCountryCorridors(params: CountryCorridorsParams): Promise<CountryCorridorBreakdown>;
    getGlobalInsights(params: GlobalInsightsParams): Promise<GlobalInsightsMetric>;
    /** Distinct stablecoin ticker symbols actually present in corridor data for the period — used to populate the stablecoin filter with real values. */
    getCorridorStablecoins(params: CorridorStablecoinsParams): Promise<string[]>;
}

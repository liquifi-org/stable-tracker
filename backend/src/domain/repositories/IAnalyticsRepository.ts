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
    name: string;
    region: string;
    adoptionRate: number;
    activeWallets: number;
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
    name: string;
    region: string;
    adoptionRate: number;
    activeWallets: number;
    txValueShare: number;
    dollarizationIndex: number;
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

export interface IAnalyticsRepository {
    getAdoptionMetrics(params: AdoptionParams): Promise<CountryAdoptionMetric[]>;
    getCorridorFlows(
        params: CorridorParams,
    ): Promise<CorridorFlow[] | BidirectionalCorridorFlow[]>;
    getCountryOverview(params: CountryOverviewParams): Promise<CountryOverview | null>;
    getCountryCorridors(params: CountryCorridorsParams): Promise<CountryCorridorBreakdown>;
}

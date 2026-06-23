import type { IssuerDto } from './IssuerDto';
import type { LicenseDto } from './LicenseDto';
import type { ReserveTypeDto } from './ReserveTypeDto';
import type { MoneyDto } from './TransactionDto';

export interface CountryAdoptionMetricDto {
    countryId: string;
    isoAlpha2: string;
    name: string;
    region: string;
    macroRegion: string | null;
    adoptionRate: number;
    activeWallets: number;
    txValueShare: number;
    unit: 'ratio' | 'percent';
    remittancesSent?: number;
    adoptionRank: number | null;
    eligibleCountries: number;
    relativeAdoptionIndex: number | null;
}

export interface RegionalAdoptionMetricDto {
    region: string;
    countryCount: number;
    activeWallets: number;
    population: number;
    adoptionRate: number;
    txValueShare: number;
    unit: 'ratio' | 'percent';
}

export interface StablecoinShareDto {
    stablecoinId: string;
    name: string;
    share: number;
}

export interface CorridorFlowDto {
    from: string;
    to: string;
    value: MoneyDto;
    dollarizationIndex: number;
    topStablecoins?: StablecoinShareDto[];
}

export interface BidirectionalCorridorFlowDto {
    country1: string;
    country2: string;
    valueFromCountry1: MoneyDto;
    valueFromCountry2: MoneyDto;
    totalValue: MoneyDto;
    dollarizationIndex: number;
}

export interface CountryOverviewDto {
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
    compliantIssuers: IssuerDto[];
    licenses: LicenseDto[];
    reserveTypes: ReserveTypeDto[];
    economicIntegration?: string;
    currencySovereignty?: string;
}

export interface CountryCorridorBreakdownDto {
    countryId: string;
    inflows: CorridorFlowDto[];
    outflows: CorridorFlowDto[];
}

export interface GlobalInsightsMetricDto {
    totalActiveWallets: number;
    liveRegulationCountries: number;
    totalTxValueUsd: number;
    totalRemittancesUsd: number;
}

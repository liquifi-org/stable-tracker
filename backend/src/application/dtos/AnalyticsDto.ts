import type { IssuerDto } from './IssuerDto';
import type { LicenseDto } from './LicenseDto';
import type { ReserveTypeDto } from './ReserveTypeDto';
import type { MoneyDto } from './TransactionDto';

export interface CountryAdoptionMetricDto {
    countryId: string;
    name: string;
    region: string;
    adoptionRate: number;
    activeWallets: number;
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
    name: string;
    region: string;
    adoptionRate: number;
    activeWallets: number;
    txValueShare: number;
    dollarizationIndex: number;
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

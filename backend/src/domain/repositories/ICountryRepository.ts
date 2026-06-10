import type { PaginatedResult } from '../../shared/types/Pagination';
import type { Country } from '../entities/Country';
import type { Issuer } from '../entities/Issuer';
import type { License } from '../entities/License';
import type { ReserveType } from '../entities/ReserveType';

export interface FindCountriesParams {
    region?: string;
    q?: string;
    page: number;
    pageSize: number;
    sort?: string;
}

export interface ICountryRepository {
    findAll(params: FindCountriesParams): Promise<PaginatedResult<Country>>;
    findById(countryId: string): Promise<Country | null>;
    findRegulatedIssuers(countryId: string): Promise<Issuer[]>;
    findRegulatedReserveTypes(countryId: string): Promise<ReserveType[]>;
    findLicenses(countryId: string): Promise<License[]>;
}

import type { PaginatedResult } from '../../shared/types/Pagination';
import type { License } from '../entities/License';

export interface FindLicensesParams {
    countryId?: string;
    type?: string;
    page: number;
    pageSize: number;
}

export interface ILicenseRepository {
    findAll(params: FindLicensesParams): Promise<PaginatedResult<License>>;
    findByIds(licenseIds: string[]): Promise<License[]>;
}

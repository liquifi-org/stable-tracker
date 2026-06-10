import type { PaginatedResult } from '../../shared/types/Pagination';
import type { Issuer } from '../entities/Issuer';

export interface FindIssuersParams {
    originCountry?: string;
    q?: string;
    page: number;
    pageSize: number;
}

export interface IIssuerRepository {
    findAll(params: FindIssuersParams): Promise<PaginatedResult<Issuer>>;
    findById(issuerId: string): Promise<Issuer | null>;
    findByIds(issuerIds: string[]): Promise<Issuer[]>;
}

import type { PaginatedResult } from '../../shared/types/Pagination';
import type { Stablecoin } from '../entities/Stablecoin';

export interface FindStablecoinsParams {
    issuerId?: string;
    referenceAsset?: string;
    q?: string;
    page: number;
    pageSize: number;
}

export interface IStablecoinRepository {
    findAll(params: FindStablecoinsParams): Promise<PaginatedResult<Stablecoin>>;
    findById(stablecoinId: string): Promise<Stablecoin | null>;
    findByIds(stablecoinIds: string[]): Promise<Stablecoin[]>;
    findByReferenceAsset(referenceAsset: string): Promise<Stablecoin[]>;
}

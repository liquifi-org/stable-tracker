import type { PaginatedResult } from '../../shared/types/Pagination';
import type { Wallet } from '../entities/Wallet';

export interface FindWalletsParams {
    countryId?: string;
    openedFrom?: string;
    openedTo?: string;
    status?: 'active' | 'closed' | 'any';
    page: number;
    pageSize: number;
}

export interface IWalletRepository {
    findAll(params: FindWalletsParams): Promise<PaginatedResult<Wallet>>;
}

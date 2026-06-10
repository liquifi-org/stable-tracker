import type { PaginatedResult } from '../../shared/types/Pagination';
import type { Transaction } from '../entities/Transaction';

export interface FindTransactionsParams {
    senderCountryId?: string;
    receiverCountryId?: string;
    stablecoinId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
}

export interface ITransactionRepository {
    findAll(params: FindTransactionsParams): Promise<PaginatedResult<Transaction>>;
}

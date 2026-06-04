import type { PaginatedResult } from '../../shared/types/Pagination';
import type { ExchangeRate } from '../entities/ExchangeRate';

export interface FindExchangeRatesParams {
    referenceAsset?: string;
    currencyOriginal?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
}

export interface IExchangeRateRepository {
    findAll(params: FindExchangeRatesParams): Promise<PaginatedResult<ExchangeRate>>;
}

import type { IExchangeRateRepository, FindExchangeRatesParams } from '../../../domain/repositories/IExchangeRateRepository';
import type { ExchangeRatePageDto } from '../../dtos/ExchangeRateDto';
import { ExchangeRateMapper } from '../../mappers/ExchangeRateMapper';
import { buildPaginatedResult } from '../../../shared/types/Pagination';

export class ListExchangeRatesUseCase {
    constructor(private readonly exchangeRateRepo: IExchangeRateRepository) {}

    async execute(params: FindExchangeRatesParams): Promise<ExchangeRatePageDto> {
        const result = await this.exchangeRateRepo.findAll(params);
        return buildPaginatedResult(
            result.items.map(ExchangeRateMapper.toDto),
            result.total,
            result.page,
            result.pageSize,
        );
    }
}

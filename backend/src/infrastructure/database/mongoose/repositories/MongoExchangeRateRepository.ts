import { ExchangeRateModel } from '../models/ExchangeRateModel';
import type { IExchangeRateRepository, FindExchangeRatesParams } from '../../../../domain/repositories/IExchangeRateRepository';
import type { PaginatedResult } from '../../../../shared/types/Pagination';
import { ExchangeRate } from '../../../../domain/entities/ExchangeRate';
import { buildPaginatedResult } from '../../../../shared/types/Pagination';

export class MongoExchangeRateRepository implements IExchangeRateRepository {
    async findAll(params: FindExchangeRatesParams): Promise<PaginatedResult<ExchangeRate>> {
        const { page, pageSize, referenceAsset, currencyOriginal, dateFrom, dateTo } = params;
        const filter: Record<string, unknown> = {};

        if (referenceAsset) filter['referenceAsset'] = referenceAsset;
        if (currencyOriginal) filter['currencyOriginal'] = currencyOriginal;

        const dateFilter: Record<string, unknown> = {};
        if (dateFrom) dateFilter['$gte'] = new Date(dateFrom);
        if (dateTo) dateFilter['$lte'] = new Date(dateTo);
        if (Object.keys(dateFilter).length) filter['date'] = dateFilter;

        const skip = (page - 1) * pageSize;

        const [docs, total] = await Promise.all([
            ExchangeRateModel.find(filter).sort({ date: -1 }).skip(skip).limit(pageSize).lean(),
            ExchangeRateModel.countDocuments(filter),
        ]);

        const items = docs.map(
            (d) =>
                new ExchangeRate({
                    referenceAsset: d.referenceAsset,
                    currencyOriginal: d.currencyOriginal,
                    usdExchangeRate: d.usdExchangeRate,
                    date: d.date,
                }),
        );
        return buildPaginatedResult(items, total, page, pageSize);
    }
}

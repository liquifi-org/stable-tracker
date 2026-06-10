import { TransactionModel } from '../models/TransactionModel';
import type { ITransactionRepository, FindTransactionsParams } from '../../../../domain/repositories/ITransactionRepository';
import type { PaginatedResult } from '../../../../shared/types/Pagination';
import { Transaction } from '../../../../domain/entities/Transaction';
import { buildPaginatedResult } from '../../../../shared/types/Pagination';
import type { TransactionTypeValue } from '../../../../domain/value-objects/TransactionType';

export class MongoTransactionRepository implements ITransactionRepository {
    async findAll(params: FindTransactionsParams): Promise<PaginatedResult<Transaction>> {
        const {
            page,
            pageSize,
            senderCountryId,
            receiverCountryId,
            stablecoinId,
            type,
            dateFrom,
            dateTo,
        } = params;

        const filter: Record<string, unknown> = {};
        if (senderCountryId) filter['senderCountryId'] = senderCountryId;
        if (receiverCountryId) filter['receiverCountryId'] = receiverCountryId;
        if (stablecoinId) filter['stablecoinId'] = stablecoinId;
        if (type) filter['type'] = type;

        const dateFilter: Record<string, unknown> = {};
        if (dateFrom) dateFilter['$gte'] = new Date(dateFrom);
        if (dateTo) dateFilter['$lte'] = new Date(dateTo);
        if (Object.keys(dateFilter).length) filter['date'] = dateFilter;

        const skip = (page - 1) * pageSize;

        const [docs, total] = await Promise.all([
            TransactionModel.find(filter).sort({ date: -1 }).skip(skip).limit(pageSize).lean(),
            TransactionModel.countDocuments(filter),
        ]);

        const items = docs.map(
            (d) =>
                new Transaction({
                    transactionId: d.transactionId,
                    senderCountryId: d.senderCountryId,
                    receiverCountryId: d.receiverCountryId,
                    date: d.date,
                    type: d.type as TransactionTypeValue,
                    stablecoinId: d.stablecoinId,
                    value: { amount: d.value.amount, currency: d.value.currency },
                }),
        );
        return buildPaginatedResult(items, total, page, pageSize);
    }
}

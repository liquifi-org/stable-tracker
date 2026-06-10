import { WalletModel } from '../models/WalletModel';
import type { IWalletRepository, FindWalletsParams } from '../../../../domain/repositories/IWalletRepository';
import type { PaginatedResult } from '../../../../shared/types/Pagination';
import { Wallet } from '../../../../domain/entities/Wallet';
import { buildPaginatedResult } from '../../../../shared/types/Pagination';

export class MongoWalletRepository implements IWalletRepository {
    async findAll(params: FindWalletsParams): Promise<PaginatedResult<Wallet>> {
        const { page, pageSize, countryId, openedFrom, openedTo, status } = params;
        const filter: Record<string, unknown> = {};

        if (countryId) filter['countryId'] = countryId;

        const openedFilter: Record<string, unknown> = {};
        if (openedFrom) openedFilter['$gte'] = new Date(openedFrom);
        if (openedTo) openedFilter['$lte'] = new Date(openedTo);
        if (Object.keys(openedFilter).length) filter['dateOpened'] = openedFilter;

        if (status === 'active') {
            filter['dateClosed'] = null;
        } else if (status === 'closed') {
            filter['dateClosed'] = { $ne: null };
        }

        const skip = (page - 1) * pageSize;

        const [docs, total] = await Promise.all([
            WalletModel.find(filter).sort({ dateOpened: -1 }).skip(skip).limit(pageSize).lean(),
            WalletModel.countDocuments(filter),
        ]);

        const items = docs.map(
            (d) =>
                new Wallet({
                    walletId: d.walletId,
                    countryId: d.countryId,
                    dateOpened: d.dateOpened,
                    dateClosed: d.dateClosed,
                }),
        );
        return buildPaginatedResult(items, total, page, pageSize);
    }
}

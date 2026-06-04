import { StablecoinModel } from '../models/StablecoinModel';
import type { IStablecoinRepository, FindStablecoinsParams } from '../../../../domain/repositories/IStablecoinRepository';
import type { PaginatedResult } from '../../../../shared/types/Pagination';
import { Stablecoin } from '../../../../domain/entities/Stablecoin';
import { buildPaginatedResult } from '../../../../shared/types/Pagination';

export class MongoStablecoinRepository implements IStablecoinRepository {
    async findAll(params: FindStablecoinsParams): Promise<PaginatedResult<Stablecoin>> {
        const { page, pageSize, issuerId, referenceAsset, q } = params;
        const filter: Record<string, unknown> = {};

        if (issuerId) filter['issuerId'] = issuerId;
        if (referenceAsset) filter['referenceAsset'] = referenceAsset;
        if (q) filter['$text'] = { $search: q };

        const skip = (page - 1) * pageSize;

        const [docs, total] = await Promise.all([
            StablecoinModel.find(filter).skip(skip).limit(pageSize).lean(),
            StablecoinModel.countDocuments(filter),
        ]);

        const items = docs.map(
            (d) =>
                new Stablecoin({
                    stablecoinId: d.stablecoinId,
                    name: d.name,
                    issuerId: d.issuerId,
                    referenceAsset: d.referenceAsset,
                }),
        );
        return buildPaginatedResult(items, total, page, pageSize);
    }

    async findById(stablecoinId: string): Promise<Stablecoin | null> {
        const doc = await StablecoinModel.findOne({ stablecoinId }).lean();
        if (!doc) return null;
        return new Stablecoin({
            stablecoinId: doc.stablecoinId,
            name: doc.name,
            issuerId: doc.issuerId,
            referenceAsset: doc.referenceAsset,
        });
    }

    async findByIds(stablecoinIds: string[]): Promise<Stablecoin[]> {
        const docs = await StablecoinModel.find({ stablecoinId: { $in: stablecoinIds } }).lean();
        return docs.map(
            (d) =>
                new Stablecoin({
                    stablecoinId: d.stablecoinId,
                    name: d.name,
                    issuerId: d.issuerId,
                    referenceAsset: d.referenceAsset,
                }),
        );
    }

    async findByReferenceAsset(referenceAsset: string): Promise<Stablecoin[]> {
        const docs = await StablecoinModel.find({ referenceAsset }).lean();
        return docs.map(
            (d) =>
                new Stablecoin({
                    stablecoinId: d.stablecoinId,
                    name: d.name,
                    issuerId: d.issuerId,
                    referenceAsset: d.referenceAsset,
                }),
        );
    }
}

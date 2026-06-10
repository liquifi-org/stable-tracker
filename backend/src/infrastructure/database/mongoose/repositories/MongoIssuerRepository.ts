import { IssuerModel } from '../models/IssuerModel';
import type { IIssuerRepository, FindIssuersParams } from '../../../../domain/repositories/IIssuerRepository';
import type { PaginatedResult } from '../../../../shared/types/Pagination';
import { Issuer } from '../../../../domain/entities/Issuer';
import { buildPaginatedResult } from '../../../../shared/types/Pagination';

export class MongoIssuerRepository implements IIssuerRepository {
    async findAll(params: FindIssuersParams): Promise<PaginatedResult<Issuer>> {
        const { page, pageSize, originCountry, q } = params;
        const filter: Record<string, unknown> = {};

        if (originCountry) filter['originCountry'] = originCountry;
        if (q) filter['$text'] = { $search: q };

        const skip = (page - 1) * pageSize;

        const [docs, total] = await Promise.all([
            IssuerModel.find(filter).skip(skip).limit(pageSize).lean(),
            IssuerModel.countDocuments(filter),
        ]);

        const items = docs.map(
            (d) => new Issuer({ issuerId: d.issuerId, name: d.name, originCountry: d.originCountry }),
        );
        return buildPaginatedResult(items, total, page, pageSize);
    }

    async findById(issuerId: string): Promise<Issuer | null> {
        const doc = await IssuerModel.findOne({ issuerId }).lean();
        if (!doc) return null;
        return new Issuer({ issuerId: doc.issuerId, name: doc.name, originCountry: doc.originCountry });
    }

    async findByIds(issuerIds: string[]): Promise<Issuer[]> {
        const docs = await IssuerModel.find({ issuerId: { $in: issuerIds } }).lean();
        return docs.map(
            (d) => new Issuer({ issuerId: d.issuerId, name: d.name, originCountry: d.originCountry }),
        );
    }
}

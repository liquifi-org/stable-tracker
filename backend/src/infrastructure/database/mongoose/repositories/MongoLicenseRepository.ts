import { LicenseModel } from '../models/LicenseModel';
import type { ILicenseRepository, FindLicensesParams } from '../../../../domain/repositories/ILicenseRepository';
import type { PaginatedResult } from '../../../../shared/types/Pagination';
import { License } from '../../../../domain/entities/License';
import { buildPaginatedResult } from '../../../../shared/types/Pagination';

export class MongoLicenseRepository implements ILicenseRepository {
    async findAll(params: FindLicensesParams): Promise<PaginatedResult<License>> {
        const { page, pageSize, countryId, type } = params;
        const filter: Record<string, unknown> = {};

        if (countryId) filter['countryId'] = countryId;
        if (type) filter['type'] = type;

        const skip = (page - 1) * pageSize;

        const [docs, total] = await Promise.all([
            LicenseModel.find(filter).skip(skip).limit(pageSize).lean(),
            LicenseModel.countDocuments(filter),
        ]);

        const items = docs.map(
            (d) =>
                new License({
                    licenseId: d.licenseId,
                    name: d.name,
                    type: d.type,
                    countryId: d.countryId,
                }),
        );
        return buildPaginatedResult(items, total, page, pageSize);
    }

    async findByIds(licenseIds: string[]): Promise<License[]> {
        const docs = await LicenseModel.find({ licenseId: { $in: licenseIds } }).lean();
        return docs.map(
            (d) =>
                new License({
                    licenseId: d.licenseId,
                    name: d.name,
                    type: d.type,
                    countryId: d.countryId,
                }),
        );
    }
}

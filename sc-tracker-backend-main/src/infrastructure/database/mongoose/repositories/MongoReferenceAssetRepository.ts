import { ReferenceAssetModel } from '../models/ReferenceAssetModel';
import type { IReferenceAssetRepository, FindReferenceAssetsParams } from '../../../../domain/repositories/IReferenceAssetRepository';
import { ReferenceAsset } from '../../../../domain/entities/ReferenceAsset';
import type { ReserveTypeCodeValue } from '../../../../domain/value-objects/ReserveTypeCode';

export class MongoReferenceAssetRepository implements IReferenceAssetRepository {
    async findAll(params: FindReferenceAssetsParams): Promise<ReferenceAsset[]> {
        const filter: Record<string, unknown> = {};
        if (params.reserveType) filter['reserveType'] = params.reserveType;

        const docs = await ReferenceAssetModel.find(filter).lean();
        return docs.map(
            (d) =>
                new ReferenceAsset({
                    referenceAsset: d.referenceAsset,
                    reserveType: d.reserveType as ReserveTypeCodeValue,
                }),
        );
    }
}

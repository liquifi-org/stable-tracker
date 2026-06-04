import type { ReferenceAsset } from '../entities/ReferenceAsset';

export interface FindReferenceAssetsParams {
    reserveType?: string;
}

export interface IReferenceAssetRepository {
    findAll(params: FindReferenceAssetsParams): Promise<ReferenceAsset[]>;
}

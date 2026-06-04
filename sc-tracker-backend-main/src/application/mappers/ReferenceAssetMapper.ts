import type { ReferenceAsset } from '../../domain/entities/ReferenceAsset';
import type { ReferenceAssetDto } from '../dtos/ReferenceAssetDto';

export class ReferenceAssetMapper {
    static toDto(ra: ReferenceAsset): ReferenceAssetDto {
        return {
            referenceAsset: ra.referenceAsset,
            reserveType: ra.reserveType,
        };
    }
}

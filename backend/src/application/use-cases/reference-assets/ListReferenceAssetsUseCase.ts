import type { IReferenceAssetRepository, FindReferenceAssetsParams } from '../../../domain/repositories/IReferenceAssetRepository';
import type { ReferenceAssetDto } from '../../dtos/ReferenceAssetDto';
import { ReferenceAssetMapper } from '../../mappers/ReferenceAssetMapper';

export class ListReferenceAssetsUseCase {
    constructor(private readonly referenceAssetRepo: IReferenceAssetRepository) {}

    async execute(params: FindReferenceAssetsParams): Promise<ReferenceAssetDto[]> {
        const items = await this.referenceAssetRepo.findAll(params);
        return items.map(ReferenceAssetMapper.toDto);
    }
}

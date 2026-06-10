import type { Stablecoin } from '../../domain/entities/Stablecoin';
import type { StablecoinDto } from '../dtos/StablecoinDto';

export class StablecoinMapper {
    static toDto(stablecoin: Stablecoin): StablecoinDto {
        return {
            stablecoinId: stablecoin.stablecoinId,
            name: stablecoin.name,
            issuerId: stablecoin.issuerId,
            referenceAsset: stablecoin.referenceAsset,
        };
    }
}

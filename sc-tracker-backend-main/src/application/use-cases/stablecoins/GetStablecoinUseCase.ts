import type { IStablecoinRepository } from '../../../domain/repositories/IStablecoinRepository';
import type { StablecoinDto } from '../../dtos/StablecoinDto';
import { StablecoinMapper } from '../../mappers/StablecoinMapper';
import { NotFoundError } from '../../../domain/errors/NotFoundError';

export class GetStablecoinUseCase {
    constructor(private readonly stablecoinRepo: IStablecoinRepository) {}

    async execute(stablecoinId: string): Promise<StablecoinDto> {
        const stablecoin = await this.stablecoinRepo.findById(stablecoinId);
        if (!stablecoin) throw new NotFoundError('Stablecoin', stablecoinId);
        return StablecoinMapper.toDto(stablecoin);
    }
}

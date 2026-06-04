import type { IStablecoinRepository, FindStablecoinsParams } from '../../../domain/repositories/IStablecoinRepository';
import type { StablecoinPageDto } from '../../dtos/StablecoinDto';
import { StablecoinMapper } from '../../mappers/StablecoinMapper';
import { buildPaginatedResult } from '../../../shared/types/Pagination';

export class ListStablecoinsUseCase {
    constructor(private readonly stablecoinRepo: IStablecoinRepository) {}

    async execute(params: FindStablecoinsParams): Promise<StablecoinPageDto> {
        const result = await this.stablecoinRepo.findAll(params);
        return buildPaginatedResult(
            result.items.map(StablecoinMapper.toDto),
            result.total,
            result.page,
            result.pageSize,
        );
    }
}

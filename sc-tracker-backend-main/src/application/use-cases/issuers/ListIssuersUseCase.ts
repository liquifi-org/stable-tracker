import type { IIssuerRepository, FindIssuersParams } from '../../../domain/repositories/IIssuerRepository';
import type { IssuerPageDto } from '../../dtos/IssuerDto';
import { IssuerMapper } from '../../mappers/IssuerMapper';
import { buildPaginatedResult } from '../../../shared/types/Pagination';

export class ListIssuersUseCase {
    constructor(private readonly issuerRepo: IIssuerRepository) {}

    async execute(params: FindIssuersParams): Promise<IssuerPageDto> {
        const result = await this.issuerRepo.findAll(params);
        return buildPaginatedResult(
            result.items.map(IssuerMapper.toDto),
            result.total,
            result.page,
            result.pageSize,
        );
    }
}

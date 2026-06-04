import type { ILicenseRepository, FindLicensesParams } from '../../../domain/repositories/ILicenseRepository';
import type { LicensePageDto } from '../../dtos/LicenseDto';
import { LicenseMapper } from '../../mappers/LicenseMapper';
import { buildPaginatedResult } from '../../../shared/types/Pagination';

export class ListLicensesUseCase {
    constructor(private readonly licenseRepo: ILicenseRepository) {}

    async execute(params: FindLicensesParams): Promise<LicensePageDto> {
        const result = await this.licenseRepo.findAll(params);
        return buildPaginatedResult(
            result.items.map(LicenseMapper.toDto),
            result.total,
            result.page,
            result.pageSize,
        );
    }
}

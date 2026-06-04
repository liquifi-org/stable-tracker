import type { ICountryRepository } from '../../../domain/repositories/ICountryRepository';
import type { LicenseDto } from '../../dtos/LicenseDto';
import { LicenseMapper } from '../../mappers/LicenseMapper';
import { NotFoundError } from '../../../domain/errors/NotFoundError';

export class ListCountryLicensesUseCase {
    constructor(private readonly countryRepo: ICountryRepository) {}

    async execute(countryId: string): Promise<LicenseDto[]> {
        const country = await this.countryRepo.findById(countryId);
        if (!country) throw new NotFoundError('Country', countryId);
        const licenses = await this.countryRepo.findLicenses(countryId);
        return licenses.map(LicenseMapper.toDto);
    }
}

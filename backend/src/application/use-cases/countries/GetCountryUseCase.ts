import type { ICountryRepository } from '../../../domain/repositories/ICountryRepository';
import type { CountryDto } from '../../dtos/CountryDto';
import { CountryMapper } from '../../mappers/CountryMapper';
import { NotFoundError } from '../../../domain/errors/NotFoundError';

export class GetCountryUseCase {
    constructor(private readonly countryRepo: ICountryRepository) {}

    async execute(countryId: string): Promise<CountryDto> {
        const country = await this.countryRepo.findById(countryId);
        if (!country) throw new NotFoundError('Country', countryId);
        return CountryMapper.toDto(country);
    }
}

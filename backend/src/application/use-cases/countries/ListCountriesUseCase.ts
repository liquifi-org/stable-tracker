import type { ICountryRepository, FindCountriesParams } from '../../../domain/repositories/ICountryRepository';
import type { CountryPageDto } from '../../dtos/CountryDto';
import { CountryMapper } from '../../mappers/CountryMapper';
import { buildPaginatedResult } from '../../../shared/types/Pagination';

export class ListCountriesUseCase {
    constructor(private readonly countryRepo: ICountryRepository) {}

    async execute(params: FindCountriesParams): Promise<CountryPageDto> {
        const result = await this.countryRepo.findAll(params);
        return buildPaginatedResult(
            result.items.map(CountryMapper.toDto),
            result.total,
            result.page,
            result.pageSize,
        );
    }
}

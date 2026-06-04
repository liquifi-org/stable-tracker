import type { Country } from '../../domain/entities/Country';
import type { CountryDto } from '../dtos/CountryDto';

export class CountryMapper {
    static toDto(country: Country): CountryDto {
        return {
            countryId: country.countryId,
            name: country.name,
            region: country.region,
        };
    }
}

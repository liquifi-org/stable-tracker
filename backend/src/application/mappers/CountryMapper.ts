import type { Country } from '../../domain/entities/Country';
import type { CountryDto } from '../dtos/CountryDto';

export class CountryMapper {
    static toDto(country: Country): CountryDto {
        return {
            countryId: country.countryId,
            name: country.name,
            region: country.region,
            stage: country.stage,
            regulatorName: country.regulatorName,
            regulatorDescription: country.regulatorDescription,
            description: country.description,
            currency: country.currency,
            fiatBacked: country.fiatBacked,
            fiatAlert: country.fiatAlert,
            cryptoBacked: country.cryptoBacked,
            cryptoAlert: country.cryptoAlert,
            commodityBacked: country.commodityBacked,
            commodityAlert: country.commodityAlert,
            algorithmBacked: country.algorithmBacked,
            algorithmAlert: country.algorithmAlert,
            isStablecoinSpecific: country.isStablecoinSpecific,
        };
    }
}

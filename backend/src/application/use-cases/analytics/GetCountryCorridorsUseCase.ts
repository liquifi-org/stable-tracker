import type { IAnalyticsRepository, CountryCorridorsParams } from '../../../domain/repositories/IAnalyticsRepository';
import type { CountryCorridorBreakdownDto } from '../../dtos/AnalyticsDto';

export class GetCountryCorridorsUseCase {
    constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

    async execute(params: CountryCorridorsParams): Promise<CountryCorridorBreakdownDto> {
        return this.analyticsRepo.getCountryCorridors(params);
    }
}

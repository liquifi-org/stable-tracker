import type { IAnalyticsRepository, CountryOverviewParams } from '../../../domain/repositories/IAnalyticsRepository';
import type { CountryOverviewDto } from '../../dtos/AnalyticsDto';
import { NotFoundError } from '../../../domain/errors/NotFoundError';

export class GetCountryOverviewUseCase {
    constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

    async execute(params: CountryOverviewParams): Promise<CountryOverviewDto> {
        const overview = await this.analyticsRepo.getCountryOverview(params);
        if (!overview) throw new NotFoundError('Country', params.countryId);
        return overview;
    }
}

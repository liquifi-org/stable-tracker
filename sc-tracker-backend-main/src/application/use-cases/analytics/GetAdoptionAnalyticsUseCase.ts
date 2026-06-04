import type { IAnalyticsRepository, AdoptionParams } from '../../../domain/repositories/IAnalyticsRepository';
import type { CountryAdoptionMetricDto } from '../../dtos/AnalyticsDto';

export class GetAdoptionAnalyticsUseCase {
    constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

    async execute(params: AdoptionParams): Promise<CountryAdoptionMetricDto[]> {
        return this.analyticsRepo.getAdoptionMetrics(params);
    }
}

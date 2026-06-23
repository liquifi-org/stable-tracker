import type { IAnalyticsRepository, AdoptionParams } from '../../../domain/repositories/IAnalyticsRepository';
import type { RegionalAdoptionMetricDto } from '../../dtos/AnalyticsDto';

export class GetRegionalAdoptionAnalyticsUseCase {
    constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

    async execute(params: AdoptionParams): Promise<RegionalAdoptionMetricDto[]> {
        return this.analyticsRepo.getRegionalAdoptionMetrics(params);
    }
}

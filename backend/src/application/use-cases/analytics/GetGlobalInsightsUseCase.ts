import type { IAnalyticsRepository, GlobalInsightsParams } from '../../../domain/repositories/IAnalyticsRepository';
import type { GlobalInsightsMetricDto } from '../../dtos/AnalyticsDto';

export class GetGlobalInsightsUseCase {
    constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

    async execute(params: GlobalInsightsParams): Promise<GlobalInsightsMetricDto> {
        return this.analyticsRepo.getGlobalInsights(params);
    }
}

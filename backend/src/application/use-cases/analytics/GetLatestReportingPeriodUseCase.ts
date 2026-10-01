import type { IAnalyticsRepository } from '../../../domain/repositories/IAnalyticsRepository';

export class GetLatestReportingPeriodUseCase {
    constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

    async execute(): Promise<{ year: number; month: number } | null> {
        return this.analyticsRepo.getLatestReportingPeriod();
    }
}

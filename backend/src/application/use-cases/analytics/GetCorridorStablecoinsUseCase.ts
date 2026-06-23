import type { IAnalyticsRepository, CorridorStablecoinsParams } from '../../../domain/repositories/IAnalyticsRepository';

export class GetCorridorStablecoinsUseCase {
    constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

    async execute(params: CorridorStablecoinsParams): Promise<string[]> {
        return this.analyticsRepo.getCorridorStablecoins(params);
    }
}

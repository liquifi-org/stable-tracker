import type { IAnalyticsRepository, CorridorParams } from '../../../domain/repositories/IAnalyticsRepository';
import type { CorridorFlowDto, BidirectionalCorridorFlowDto } from '../../dtos/AnalyticsDto';

export class GetCorridorAnalyticsUseCase {
    constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

    async execute(params: CorridorParams): Promise<CorridorFlowDto[] | BidirectionalCorridorFlowDto[]> {
        return this.analyticsRepo.getCorridorFlows(params);
    }
}

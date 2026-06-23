import { Request, Response, NextFunction } from 'express';
import type { GetAdoptionAnalyticsUseCase } from '../../../application/use-cases/analytics/GetAdoptionAnalyticsUseCase';
import type { GetRegionalAdoptionAnalyticsUseCase } from '../../../application/use-cases/analytics/GetRegionalAdoptionAnalyticsUseCase';
import type { GetCorridorAnalyticsUseCase } from '../../../application/use-cases/analytics/GetCorridorAnalyticsUseCase';
import type { GetCountryOverviewUseCase } from '../../../application/use-cases/analytics/GetCountryOverviewUseCase';
import type { GetCountryCorridorsUseCase } from '../../../application/use-cases/analytics/GetCountryCorridorsUseCase';
import type { GetGlobalInsightsUseCase } from '../../../application/use-cases/analytics/GetGlobalInsightsUseCase';
import type { GetCorridorStablecoinsUseCase } from '../../../application/use-cases/analytics/GetCorridorStablecoinsUseCase';
import {
    AdoptionQuerySchema,
    CorridorQuerySchema,
    CountryOverviewQuerySchema,
    CountryCorridorsQuerySchema,
    CountryIdPathSchema,
    GlobalInsightsQuerySchema,
    CorridorStablecoinsQuerySchema,
} from '../validators/analyticsValidators';

export class AnalyticsController {
    constructor(
        private readonly getAdoption: GetAdoptionAnalyticsUseCase,
        private readonly getRegionalAdoption: GetRegionalAdoptionAnalyticsUseCase,
        private readonly getCorridors: GetCorridorAnalyticsUseCase,
        private readonly getCountryOverview: GetCountryOverviewUseCase,
        private readonly getCountryCorridors: GetCountryCorridorsUseCase,
        private readonly getGlobalInsights: GetGlobalInsightsUseCase,
        private readonly getCorridorStablecoins: GetCorridorStablecoinsUseCase,
    ) {}

    adoption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = AdoptionQuerySchema.parse(req.query);
            const result = await this.getAdoption.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    adoptionByRegion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = AdoptionQuerySchema.parse(req.query);
            const result = await this.getRegionalAdoption.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    corridors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = CorridorQuerySchema.parse(req.query);
            const result = await this.getCorridors.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    countryOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { countryId } = CountryIdPathSchema.parse(req.params);
            const query = CountryOverviewQuerySchema.parse(req.query);
            const result = await this.getCountryOverview.execute({ ...query, countryId });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    countryCorridors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { countryId } = CountryIdPathSchema.parse(req.params);
            const query = CountryCorridorsQuerySchema.parse(req.query);
            const result = await this.getCountryCorridors.execute({ ...query, countryId });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    globalInsights = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = GlobalInsightsQuerySchema.parse(req.query);
            const result = await this.getGlobalInsights.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    corridorStablecoins = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = CorridorStablecoinsQuerySchema.parse(req.query);
            const result = await this.getCorridorStablecoins.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

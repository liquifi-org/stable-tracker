import { Router } from 'express';
import type { AnalyticsController } from '../controllers/AnalyticsController';

export function createAnalyticsRouter(ctrl: AnalyticsController): Router {
    const router = Router();
    router.get('/global-insights', ctrl.globalInsights);
    router.get('/adoption/regions', ctrl.adoptionByRegion);
    router.get('/adoption', ctrl.adoption);
    router.get('/corridors/stablecoins', ctrl.corridorStablecoins);
    router.get('/corridors', ctrl.corridors);
    router.get('/countries/:countryId/overview', ctrl.countryOverview);
    router.get('/countries/:countryId/corridors', ctrl.countryCorridors);
    return router;
}

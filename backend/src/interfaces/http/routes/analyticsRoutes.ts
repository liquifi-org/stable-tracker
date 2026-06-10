import { Router } from 'express';
import type { AnalyticsController } from '../controllers/AnalyticsController';

export function createAnalyticsRouter(ctrl: AnalyticsController): Router {
    const router = Router();
    router.get('/adoption', ctrl.adoption);
    router.get('/corridors', ctrl.corridors);
    router.get('/countries/:countryId/overview', ctrl.countryOverview);
    router.get('/countries/:countryId/corridors', ctrl.countryCorridors);
    return router;
}

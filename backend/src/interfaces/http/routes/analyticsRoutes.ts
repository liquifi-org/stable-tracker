import { Router } from 'express';
import type { AnalyticsController } from '../controllers/AnalyticsController';

export function createAnalyticsRouter(ctrl: AnalyticsController): Router {
    const router = Router();
    router.get('/', (_req, res) => {
        res.status(200).json({
            name: 'Stablecoin Tracker analytics',
            filters: 'https://stabletracker.org/dataset.md',
            endpoints: [
                '/v1/analytics/global-insights?year=&month=',
                '/v1/analytics/adoption?year=&month=',
                '/v1/analytics/adoption/regions?year=&month=',
                '/v1/analytics/corridors?year=&month=&referenceAsset=&stablecoinId=&regionFrom=&regionTo=',
                '/v1/analytics/corridors/stablecoins?year=&month=',
                '/v1/analytics/countries/{isoNumeric}/overview?year=&month=',
                '/v1/analytics/countries/{isoNumeric}/corridors?year=&month=',
            ],
        });
    });
    router.get('/global-insights', ctrl.globalInsights);
    router.get('/adoption/regions', ctrl.adoptionByRegion);
    router.get('/adoption', ctrl.adoption);
    router.get('/corridors/stablecoins', ctrl.corridorStablecoins);
    router.get('/corridors', ctrl.corridors);
    router.get('/countries/:countryId/overview', ctrl.countryOverview);
    router.get('/countries/:countryId/corridors', ctrl.countryCorridors);
    return router;
}

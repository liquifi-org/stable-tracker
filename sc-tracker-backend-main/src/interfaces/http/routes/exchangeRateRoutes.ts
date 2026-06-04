import { Router } from 'express';
import type { ExchangeRateController } from '../controllers/ExchangeRateController';

export function createExchangeRateRouter(ctrl: ExchangeRateController): Router {
    const router = Router();
    router.get('/', ctrl.list);
    return router;
}

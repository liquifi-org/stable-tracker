import { Router } from 'express';
import type { AdminController } from '../controllers/AdminController';
import { adminAuth } from '../middleware/adminAuth';

export function createAdminRouter(ctrl: AdminController): Router {
    const router = Router();

    router.use(adminAuth);

    router.post('/sync/all', ctrl.syncAll);
    router.post('/sync/wallets', ctrl.syncWallets);
    router.post('/sync/population', ctrl.syncPopulation);

    return router;
}


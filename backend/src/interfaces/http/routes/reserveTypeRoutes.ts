import { Router } from 'express';
import type { ReserveTypeController } from '../controllers/ReserveTypeController';

export function createReserveTypeRouter(ctrl: ReserveTypeController): Router {
    const router = Router();
    router.get('/', ctrl.list);
    return router;
}

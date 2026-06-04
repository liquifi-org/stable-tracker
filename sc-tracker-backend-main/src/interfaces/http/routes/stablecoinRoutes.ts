import { Router } from 'express';
import type { StablecoinController } from '../controllers/StablecoinController';

export function createStablecoinRouter(ctrl: StablecoinController): Router {
    const router = Router();
    router.get('/', ctrl.list);
    router.get('/:stablecoinId', ctrl.getById);
    return router;
}

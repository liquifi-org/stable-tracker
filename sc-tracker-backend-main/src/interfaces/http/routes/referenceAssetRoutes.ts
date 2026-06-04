import { Router } from 'express';
import type { ReferenceAssetController } from '../controllers/ReferenceAssetController';

export function createReferenceAssetRouter(ctrl: ReferenceAssetController): Router {
    const router = Router();
    router.get('/', ctrl.list);
    return router;
}

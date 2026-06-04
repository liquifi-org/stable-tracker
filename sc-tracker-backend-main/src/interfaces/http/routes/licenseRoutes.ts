import { Router } from 'express';
import type { LicenseController } from '../controllers/LicenseController';

export function createLicenseRouter(ctrl: LicenseController): Router {
    const router = Router();
    router.get('/', ctrl.list);
    return router;
}

import { Router } from 'express';
import type { IssuerController } from '../controllers/IssuerController';

export function createIssuerRouter(ctrl: IssuerController): Router {
    const router = Router();
    router.get('/', ctrl.list);
    router.get('/:issuerId', ctrl.getById);
    return router;
}

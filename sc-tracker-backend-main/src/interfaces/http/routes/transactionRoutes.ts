import { Router } from 'express';
import type { TransactionController } from '../controllers/TransactionController';

export function createTransactionRouter(ctrl: TransactionController): Router {
    const router = Router();
    router.get('/', ctrl.list);
    return router;
}

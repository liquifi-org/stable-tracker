import { Router } from 'express';
import type { WalletController } from '../controllers/WalletController';

export function createWalletRouter(ctrl: WalletController): Router {
    const router = Router();
    router.get('/', ctrl.list);
    return router;
}

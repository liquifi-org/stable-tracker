import { Router } from 'express';
import type { ContactController } from '../controllers/ContactController';
import { contactRateLimit } from '../middleware/contactRateLimit';

export function createContactRouter(ctrl: ContactController): Router {
    const router = Router();
    router.post('/', contactRateLimit, ctrl.submit);
    return router;
}

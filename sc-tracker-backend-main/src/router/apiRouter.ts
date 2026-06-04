import { Router } from 'express';
import apiController from '../controller/apiController';
import methodNotAllowed from '../util/methodNotAllowedError';
import rateLimit from '../middleware/rateLimit';

const router = Router();

router.use(rateLimit);

router.route('/self').get(apiController.self).all(methodNotAllowed);

router.route('/health').get(apiController.health).all(methodNotAllowed);

export default router;

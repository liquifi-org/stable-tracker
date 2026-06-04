import { Router } from 'express';
import type { CountryController } from '../controllers/CountryController';

export function createCountryRouter(ctrl: CountryController): Router {
    const router = Router();

    router.get('/', ctrl.list);
    router.get('/:countryId', ctrl.getById);
    router.get('/:countryId/regulated-issuers', ctrl.getRegulatedIssuers);
    router.get('/:countryId/regulated-reserve-types', ctrl.getRegulatedReserveTypes);
    router.get('/:countryId/licenses', ctrl.getLicenses);

    return router;
}

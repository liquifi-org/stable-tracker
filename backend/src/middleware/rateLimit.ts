import { Request, Response, NextFunction } from 'express';
import { applicationEnvironment } from '../constant/application';
import config from '../config/config';
import { rateLimiterMongo } from '../config/rateLimiter';
import httpError from '../util/httpError';
import responseMessage from '../constant/responseMessage';

export default (req: Request, _res: Response, next: NextFunction) => {
    if (config.ENV === applicationEnvironment.DEVELOPMENT) {
        return next();
    }
    if (rateLimiterMongo) {
        rateLimiterMongo
            .consume(req.ip as string, 1)
            .then(() => {
                next();
            })
            .catch(() => {
                const error = new Error(responseMessage.TOO_MANY_REQUESTS);
                httpError(error, req, _res, next, 429);
            });
    }
};

import { Request, Response, NextFunction } from 'express';
import httpError from './httpError';
import responseMessage from '../constant/responseMessage';

export default {
    route: (req: Request, res: Response, next: NextFunction): void => {
        const error = new Error(responseMessage.NOT_FOUND_ROUTE(req.originalUrl));
        httpError(error, req, res, next, 404);
    },
    entity: (req: Request, res: Response, next: NextFunction): void => {
        const error = new Error(responseMessage.NOT_FOUND_ENTITY(req.params.id));
        httpError(error, req, res, next, 404);
    },
};

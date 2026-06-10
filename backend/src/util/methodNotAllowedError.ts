import { Request, Response, NextFunction } from 'express';
import httpError from './httpError';
import responseMessage from '../constant/responseMessage';

export default (req: Request, res: Response, next: NextFunction): void => {
    const error = new Error(responseMessage.METHOD_NOT_ALLOWED);
    httpError(error, req, res, next, 405);
};

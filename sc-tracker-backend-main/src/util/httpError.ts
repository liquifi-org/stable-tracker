import { NextFunction, Request, Response } from 'express';
import errorObject from './errorObject';

export default (
    err: unknown,
    req: Request,
    _res: Response,
    next: NextFunction,
    errorStatusCode?: number,
): void => {
    const errorObj = errorObject(err, req, errorStatusCode);
    next(errorObj);
};

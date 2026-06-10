import { Request, Response } from 'express';
import responseObject from './responseObject';

export default (
    req: Request,
    res: Response,
    responseStatusCode: number,
    responseMessage: string,
    data: unknown = null,
): void => {
    const responseObj = responseObject(req, responseStatusCode, responseMessage, data);
    res.status(responseObj.statusCode).json(responseObj);
};

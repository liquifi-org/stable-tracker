import { HttpError } from '../types/types';
import { Request } from 'express';
import responseMessage from '../constant/responseMessage';
import { applicationEnvironment } from '../constant/application';
import config from '../config/config';
import logger from './logger';

export default (err: unknown, req: Request, errorStatusCode: number = 500): HttpError => {
    const isError = err instanceof Error;
    const errorObject: HttpError = {
        success: false,
        statusCode: errorStatusCode,
        request: {
            ip: req.ip || null,
            method: req.method,
            url: req.originalUrl,
        },
        message: isError && err.message ? err.message : responseMessage.SOMETHING_WENT_WRONG,
        data: null,
        trace: isError ? { error: err.stack } : null,
    };

    logger.error(`CONTROLLER_ERROR`, {
        meta: errorObject,
    });

    if (config.ENV === applicationEnvironment.PRODUCTION) {
        // Remove IP and trace in production for privacy
        delete errorObject.request.ip;
        delete errorObject.trace;
    }

    return errorObject;
};

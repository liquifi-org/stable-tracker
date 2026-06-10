import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { DomainError } from '../domain/errors/DomainError';
import { HttpError } from '../types/types';
import config from '../config/config';
import { applicationEnvironment } from '../constant/application';
import logger from '../util/logger';

export default (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    // Zod validation errors
    if (error instanceof ZodError) {
        res.status(422).json({
            type: 'https://api.stablecoin-tracker.ey.com/problems/validation-error',
            title: 'Validation Error',
            status: 422,
            detail: 'Request validation failed',
            errors: (error.issues as ZodIssue[]).map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }

    // Domain errors (NotFoundError, ValidationError, etc.)
    if (error instanceof DomainError) {
        res.status(error.statusCode).json({
            type: error.type,
            title: error.name,
            status: error.statusCode,
            detail: error.message,
        });
        return;
    }

    // Legacy HttpError shape (used by existing /health + /self routes)
    if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        'success' in error
    ) {
        const httpError = error as HttpError;
        res.status(httpError.statusCode).json(httpError);
        return;
    }

    // Generic fallback
    const isError = error instanceof Error;
    logger.error('UNHANDLED_ERROR', { meta: error });
    logger.debug('UNHANDLED_ERROR_DETAIL', { meta: isError ? { message: error.message, stack: error.stack } : error });
    const body: Record<string, unknown> = {
        type: 'https://api.stablecoin-tracker.ey.com/problems/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: isError && error.message ? error.message : 'An unexpected error occurred.',
    };

    if (config.ENV !== applicationEnvironment.PRODUCTION && isError) {
        body['trace'] = error.stack;
    }

    res.status(500).json(body);
};

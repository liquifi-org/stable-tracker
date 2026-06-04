import { Request, Response, NextFunction } from 'express';
import logger from '../util/logger';

/**
 * Logs incoming requests and outgoing responses at `debug` level.
 * Active only when LOG_LEVEL=debug (or lower) is set in the environment.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    if (!logger.isDebugEnabled()) {
        next();
        return;
    }

    const start = Date.now();

    logger.debug(`--> ${req.method} ${req.originalUrl}`, {
        meta: {
            query: Object.keys(req.query).length ? req.query : undefined,
            params: Object.keys(req.params).length ? req.params : undefined,
            body: req.body && Object.keys(req.body as object).length ? req.body : undefined,
            ip: req.ip,
        },
    });

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
        logger.debug(`<-- ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`, {
            meta: { body },
        });
        return originalJson(body);
    };

    next();
}

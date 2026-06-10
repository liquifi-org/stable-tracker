import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import httpError from '../../../util/httpError';

function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

export function adminAuth(req: Request, _res: Response, next: NextFunction): void {
    const expected = process.env.ADMIN_SYNC_TOKEN;

    if (!expected) {
        return httpError(new Error('Admin sync endpoint is disabled.'), req, _res, next, 403);
    }

    const headerToken = req.header('x-admin-token');
    const authHeader = req.header('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : undefined;

    const provided = headerToken ?? bearerToken;

    if (!provided || !safeEqual(provided, expected)) {
        return httpError(new Error('Invalid or missing admin token.'), req, _res, next, 401);
    }

    next();
}


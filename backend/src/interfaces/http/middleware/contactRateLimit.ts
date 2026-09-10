import { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

const hits = new Map<string, number[]>();

function prune(now: number): void {
    for (const [ip, times] of hits) {
        const recent = times.filter((t) => now - t < WINDOW_MS);
        if (recent.length === 0) hits.delete(ip);
        else hits.set(ip, recent);
    }
}

export function contactRateLimit(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    prune(now);

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

    if (recent.length >= MAX_REQUESTS) {
        res.status(429).json({
            type: 'https://api.stablecoin-tracker.ey.com/problems/too-many-requests',
            title: 'Too Many Requests',
            status: 429,
            detail: 'Too many contact submissions. Please try again later.',
        });
        return;
    }

    hits.set(ip, [...recent, now]);
    next();
}

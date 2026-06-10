import os from 'os';
import config from '../config/config';
import { ApplicationHealth, SystemHealth } from '../types/types';

export default {
    getSystemHealth: (): SystemHealth => {
        const [l1, l5, l15] = os.loadavg();
        const cores = os.cpus().length;

        const loadPct = (load: number): string => ((load / cores) * 100).toFixed(2) + '%';

        return {
            cpuLoad: {
                last1Minute: loadPct(l1),
                last5Minutes: loadPct(l5),
                last15Minutes: loadPct(l15),
            },
            totalMemory: `${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`,
            freeMemory: `${(os.freemem() / 1024 / 1024).toFixed(2)} MB`,
        };
    },
    getApplicationHealth: (): ApplicationHealth => {
        return {
            environment: config.ENV,
            uptime: `${process.uptime().toFixed(2)} Seconds`,
            memoryUsage: {
                rss: `${(process.memoryUsage().rss / (1024 * 1024)).toFixed(2)} MB`,
                heapTotal: `${(process.memoryUsage().heapTotal / (1024 * 1024)).toFixed(2)} MB`,
                heapUsed: `${(process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)} MB`,
            },
        };
    },
};

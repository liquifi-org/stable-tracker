import { applicationEnvironment } from '../constant/application';

export type HttpResponse = {
    success: boolean;
    statusCode: number;
    request: {
        ip?: string | null;
        method: string;
        url: string;
    };
    message: string;
    data: unknown;
};

export type HttpError = {
    success: boolean;
    statusCode: number;
    request: {
        ip?: string | null;
        method: string;
        url: string;
    };
    message: string;
    data: unknown;
    trace?: object | null;
};

export interface Config {
    PORT: number;
    ENV: applicationEnvironment;
    SERVER_URL: string;
    LOG_LEVEL: string;
    DB_URL: string;
}

export interface CpuLoad {
    last1Minute: string;
    last5Minutes: string;
    last15Minutes: string;
}

export interface SystemHealth {
    cpuLoad: CpuLoad;
    totalMemory: string;
    freeMemory: string;
}

export interface ApplicationHealth {
    environment: applicationEnvironment;
    uptime: string;
    memoryUsage: {
        rss: string;
        heapTotal: string;
        heapUsed: string;
    };
}

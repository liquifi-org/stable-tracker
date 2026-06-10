import { createLogger, format, transports } from 'winston';
import config from '../config/config';
import path from 'path';
import fs from 'fs';
import { colorizeLevel } from './colorUtil';
import { gray, magenta } from 'colorette';
import { MongoDB, MongoDBTransportInstance } from 'winston-mongodb';

const logsDir = path.join(__dirname, '../', '../', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const consoleLogFormat = format.printf(({ level, message, timestamp, metadata }) => {
    const metaObj =
        (metadata as Record<string, unknown>)?.meta ?? (metadata as Record<string, unknown>);
    const metaString =
        metaObj && Object.keys(metaObj).length
            ? `\n${magenta('META:')} ${JSON.stringify(metaObj, null, 4)}`
            : '';
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `${colorizeLevel(level)} [${gray(String(timestamp))}] : ${message}${metaString}`;
});

const consoleTransport = (): Array<transports.ConsoleTransportInstance> => {
    return [
        new transports.Console({
            level: config.LOG_LEVEL,
            format: format.combine(
                format.timestamp(),
                format.errors({ stack: true }),
                format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
                consoleLogFormat,
            ),
        }),
    ];
};

const fileLogFormat = format.printf(({ level, message, timestamp, metadata }) => {
    const metaObj = metadata as Record<string, unknown>;
    const logEntry = {
        level: level.toUpperCase(),
        message,
        timestamp,
        ...(metaObj && Object.keys(metaObj).length ? metaObj : {}),
    };
    return JSON.stringify(logEntry, null, 4);
});

const fileTransport = (): Array<transports.FileTransportInstance> => {
    return [
        new transports.File({
            filename: path.join(__dirname, '../', '../', 'logs', `${config.ENV}.log`),
            level: config.LOG_LEVEL,
            format: format.combine(
                format.timestamp(),
                format.errors({ stack: true }),
                format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
                fileLogFormat,
            ),
        }),
    ];
};

const mongoDBTransport = (): Array<MongoDBTransportInstance> => {
    return [
        new MongoDB({
            level: config.LOG_LEVEL,
            db: config.DB_URL,
            collection: 'application_logs',
            expireAfterSeconds: 3600 * 24 * 30, // 30 days
            metaKey: 'meta',
            storeHost: true,
            tryReconnect: true,
        }),
    ];
};

export default createLogger({
    defaultMeta: {},
    transports: [...consoleTransport(), ...mongoDBTransport(), ...fileTransport()],
});

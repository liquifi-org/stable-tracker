import { applicationEnvironment } from '../constant/application';
import { Config } from '../types/types';
import { isApplicationEnvironment } from '../util/envUtil';

const envValue = process.env.ENV || 'development';

const env = isApplicationEnvironment(envValue) ? envValue : applicationEnvironment.DEVELOPMENT;

const config: Config = {
    PORT: Number(process.env.PORT) || 3001,
    ENV: env,
    SERVER_URL: process.env.SERVER_URL || 'http://localhost',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    DB_URL: process.env.DB_URL || 'mongodb://localhost:27017/database',
};

export default config;

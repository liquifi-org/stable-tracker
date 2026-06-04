import mongoose from 'mongoose';
import config from '../config/config';
import logger from '../util/logger';
export default {
    connect: async () => {
        try {
            await mongoose.connect(config.DB_URL);
            logger.info('Database connected successfully.');
            return mongoose.connection;
        } catch (error) {
            logger.error('DATABASE_ERROR', { meta: error });
            throw error;
        }
    },
};

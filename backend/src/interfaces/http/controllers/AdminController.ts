import { Request, Response, NextFunction } from 'express';
import httpResponse from '../../../util/httpResponse';
import logger from '../../../util/logger';
import { run as runWalletSync } from '../../../../script/allium/sync-wallets';
import { run as runPopulationSync } from '../../../../script/general/sync-population';

export class AdminController {
    syncWallets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!process.env.ALLIUM_API_KEY) {
                httpResponse(req, res, 503, 'ALLIUM_API_KEY is not configured on the server.');
                return;
            }
            logger.info('ADMIN_SYNC_WALLETS_STARTED');
            await runWalletSync();
            logger.info('ADMIN_SYNC_WALLETS_COMPLETED');
            httpResponse(req, res, 200, 'Allium wallet sync completed.');
        } catch (error) {
            next(error);
        }
    };

    syncPopulation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('ADMIN_SYNC_POPULATION_STARTED');
            await runPopulationSync();
            logger.info('ADMIN_SYNC_POPULATION_COMPLETED');
            httpResponse(req, res, 200, 'Population sync completed.');
        } catch (error) {
            next(error);
        }
    };

    syncAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('ADMIN_SYNC_ALL_STARTED');

            await runPopulationSync();

            const results: Record<string, string> = { population: 'completed' };

            if (process.env.ALLIUM_API_KEY) {
                await runWalletSync();
                results['wallets'] = 'completed';
            } else {
                results['wallets'] = 'skipped (ALLIUM_API_KEY not configured)';
            }

            logger.info('ADMIN_SYNC_ALL_COMPLETED');
            httpResponse(req, res, 200, 'Database population completed.', results);
        } catch (error) {
            next(error);
        }
    };
}


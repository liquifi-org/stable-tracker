import { Request, Response, NextFunction } from 'express';
import httpResponse from '../../../util/httpResponse';
import logger from '../../../util/logger';
import { CountryModel } from '../../../infrastructure/database/mongoose/models/CountryModel';
import { COUNTRIES_SEED } from '../../../../migrations/data/countries.seed';
import { run as runWalletSync } from '../../../../script/allium/sync-wallets';
import { run as runPopulationSync } from '../../../../script/general/sync-population';
import { run as runStrideCountries } from '../../../../script/stride/sync-countries';
import { run as runStrideIssuers } from '../../../../script/stride/sync-issuers';
import { run as runStrideStablecoins } from '../../../../script/stride/sync-stablecoins';
import { run as runStrideLicenses } from '../../../../script/stride/sync-licenses';

export class AdminController {
    /** Seed the base country catalogue (idempotent upsert). */
    private async seedCountries(): Promise<number> {
        const ops = COUNTRIES_SEED.map((country) => ({
            updateOne: {
                filter: { countryId: country.countryId },
                update: { $set: country },
                upsert: true,
            },
        }));
        await CountryModel.bulkWrite(ops, { ordered: false });
        return ops.length;
    }

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

            const results: Record<string, string> = {};

            // 1) Base country catalogue (required by the population step).
            const seeded = await this.seedCountries();
            results['countries'] = `seeded ${seeded}`;

            // 2) Stride enrichment + related entities (issuers, stablecoins, licenses).
            if (process.env.STRIDE_API_KEY) {
                await runStrideCountries();
                await runStrideIssuers();
                await runStrideStablecoins();
                await runStrideLicenses();
                results['stride'] = 'completed';
            } else {
                results['stride'] = 'skipped (STRIDE_API_KEY not configured)';
            }

            // 3) Population (World Bank). Needs countries to exist.
            await runPopulationSync();
            results['population'] = 'completed';

            // 4) Wallet counts (Allium).
            if (process.env.ALLIUM_API_KEY) {
                await runWalletSync();
                results['wallets'] = 'completed';
            } else {
                results['wallets'] = 'skipped (ALLIUM_API_KEY not configured)';
            }

            logger.info('ADMIN_SYNC_ALL_COMPLETED');
            httpResponse(req, res, 200, 'Full database population completed.', results);
        } catch (error) {
            next(error);
        }
    };
}


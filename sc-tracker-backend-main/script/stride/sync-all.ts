/**
 * Stride sync — full pipeline
 *
 * Runs all sub-scripts in the correct order within a single DB connection,
 * sharing the rate-limit counter across all steps.
 *
 * Order: countries → issuers → stablecoins → licenses
 *
 * Usage:
 *   npm run stride:sync
 *   npm run stride:sync:local
 */

import mongoose from 'mongoose';
import { assertApiKey, DB_URL, printStats } from './_client';
import { run as runCountries } from './sync-countries';
import { run as runIssuers } from './sync-issuers';
import { run as runStablecoins } from './sync-stablecoins';
import { run as runLicenses } from './sync-licenses';

assertApiKey();

const startTime = Date.now();

console.log('🔄  Stride full sync starting…');
console.log(`    DB: ${DB_URL}\n`);

mongoose.connect(DB_URL)
    .then(async () => {
        console.log('✓  MongoDB connected\n');

        console.log('── Step 1/4: Countries + Laws ──────────────────');
        await runCountries();

        console.log('\n── Step 2/4: Issuers ───────────────────────────');
        await runIssuers();

        console.log('\n── Step 3/4: Stablecoins ───────────────────────');
        await runStablecoins();

        console.log('\n── Step 4/4: Licenses ──────────────────────────');
        await runLicenses();
    })
    .then(() => printStats(startTime))
    .then(() => mongoose.disconnect())
    .catch((err) => { console.error('❌  Fatal:', err); process.exit(1); });

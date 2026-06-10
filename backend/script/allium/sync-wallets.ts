/**
 * Sync stablecoin-holding wallet counts per country from Allium.
 *
 * Stores one snapshot per country for the current month without overwriting
 * older periods. Re-running within the same month is idempotent.
 *
 * Usage:
 *   npm run allium:sync:wallets
 *   npm run allium:sync:wallets:local
 */

import mongoose from 'mongoose';
import { WalletCountSnapshotModel } from '../../src/infrastructure/database/mongoose/models/WalletCountSnapshotModel';
import { resolveCountryId } from '../shared/iso3166';
import {
    assertApiKey,
    DB_URL,
    WALLETS_QUERY_ID,
    runAndWait,
    type ResultRow,
} from './_client';

const COUNTRY_KEYS = [
    'primary_country',
    'country',
    'country_code',
    'country_name',
    'countryid',
    'country_id',
    'iso',
    'iso_code',
    'iso2',
    'iso3',
    'iso_country_code',
    'country_iso',
];
const WALLET_COUNT_KEYS = [
    'wallets_holding_stablecoins',
    'wallet_count',
    'wallets',
    'active_wallets',
    'num_wallets',
    'n_wallets',
    'holders',
    'holder_count',
    'address_count',
    'addresses',
    'count',
];
const TOTAL_WALLET_KEYS = ['total_geo_wallets', 'total_wallets', 'geo_wallets'];
const PCT_KEYS = ['pct_holding_stablecoins', 'pct', 'percentage', 'share'];

function pickKey(row: ResultRow, candidates: string[]): string | null {
    const lowerMap = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]));
    for (const cand of candidates) {
        const actual = lowerMap.get(cand);
        if (actual !== undefined) return actual;
    }
    return null;
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const n = Number(value.replace(/,/g, ''));
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/** "YYYY-MM" period key for a given date. */
function periodKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function run(): Promise<void> {
    const startTime = Date.now();

    const rows = await runAndWait(WALLETS_QUERY_ID);
    console.log(`Received ${rows.length} row(s) from Allium.`);

    if (rows.length === 0) {
        console.warn('No rows returned, nothing to store.');
        return;
    }

    const sample = rows[0]!;
    const countryKey = pickKey(sample, COUNTRY_KEYS);
    const walletKey = pickKey(sample, WALLET_COUNT_KEYS);
    const totalKey = pickKey(sample, TOTAL_WALLET_KEYS);
    const pctKey = pickKey(sample, PCT_KEYS);

    if (!countryKey || !walletKey) {
        console.error(
            'Could not detect country/wallet-count columns. Columns found:',
            Object.keys(sample).join(', '),
        );
        console.error('Adjust COUNTRY_KEYS / WALLET_COUNT_KEYS in sync-wallets.ts to match.');
        return;
    }
    console.log(`Using columns -> country: "${countryKey}", wallets: "${walletKey}"`);

    const now = new Date();
    const period = periodKey(now);

    let matched = 0;
    let unresolved = 0;
    const ops: Parameters<typeof WalletCountSnapshotModel.bulkWrite>[0] = [];

    for (const row of rows) {
        const countryId = resolveCountryId(row[countryKey] as string);
        const walletCount = toNumber(row[walletKey]);

        if (countryId === null) {
            unresolved++;
            console.warn(`Unresolved country: ${String(row[countryKey])}`);
            continue;
        }
        if (walletCount === null) continue;

        const totalWallets = totalKey ? toNumber(row[totalKey]) : null;
        const pctHoldingStablecoins = pctKey ? toNumber(row[pctKey]) : null;

        matched++;
        ops.push({
            updateOne: {
                filter: { countryId, period },
                update: {
                    $set: {
                        walletCount,
                        ...(totalWallets !== null ? { totalWallets } : {}),
                        ...(pctHoldingStablecoins !== null ? { pctHoldingStablecoins } : {}),
                        snapshotDate: now,
                        source: 'allium',
                        syncedAt: now,
                    },
                },
                upsert: true,
            },
        });
    }

    if (ops.length > 0) {
        await WalletCountSnapshotModel.bulkWrite(ops, { ordered: false });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Allium wallet sync complete in ${elapsed}s`);
    console.log(`Period:            ${period}`);
    console.log(`Snapshots written: ${matched}`);
    console.log(`Unresolved rows:   ${unresolved}`);
}

if (process.argv[1]?.endsWith('sync-wallets.js')) {
    assertApiKey();
    mongoose
        .connect(DB_URL)
        .then(() => {
            console.log('MongoDB connected');
            return run();
        })
        .then(() => mongoose.disconnect())
        .catch((err) => {
            console.error('Fatal:', err);
            process.exit(1);
        });
}




/**
 * Sync stablecoin-holding wallet counts per country from Allium.
 *
 * Stores one snapshot per country per month in WalletCountSnapshotModel.
 * Re-running the same month is idempotent via upsert on (countryId, period).
 *
 * Defaults to the previous calendar month (passed to Allium as start_date /
 * end_date). Pass --year=YYYY --month=M to target a specific month (useful
 * for backfills).
 *
 * Usage:
 *   npm run allium:sync:wallets
 *   npm run allium:sync:wallets:local
 *   npm run allium:sync:wallets -- --year=2026 --month=3
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
    'wallets_using_stablecoins',
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

/** Parse optional --year=YYYY and --month=M from argv; defaults to previous month. */
function parseArgs(): { year: number; month: number } {
    const args = process.argv.slice(2);
    let year: number | undefined;
    let month: number | undefined;

    for (const arg of args) {
        const yearMatch = arg.match(/^--year=(\d{4})$/);
        const monthMatch = arg.match(/^--month=(\d{1,2})$/);
        if (yearMatch) year = Number(yearMatch[1]);
        if (monthMatch) month = Number(monthMatch[1]);
    }

    if (year === undefined || month === undefined) {
        const prev = new Date();
        prev.setUTCDate(1);
        prev.setUTCMonth(prev.getUTCMonth() - 1);
        year = year ?? prev.getUTCFullYear();
        month = month ?? prev.getUTCMonth() + 1;
    }

    return { year, month };
}

/** "YYYY-MM-DD" for the first day of the given year/month. */
function startOfMonth(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}-01`;
}

/** "YYYY-MM-DD" for the last day of the given year/month. */
function endOfMonth(year: number, month: number): string {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export async function run(year?: number, month?: number): Promise<void> {
    const startTime = Date.now();

    const args = parseArgs();
    const targetYear = year ?? args.year;
    const targetMonth = month ?? args.month;
    const period = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const periodDate = new Date(`${period}-01T00:00:00.000Z`);
    const startDate = startOfMonth(targetYear, targetMonth);
    const endDate = endOfMonth(targetYear, targetMonth);

    console.log(`Fetching wallet counts from Allium for ${startDate} → ${endDate}...`);

    // Allium interpolates these raw into SQL, so the parameter value itself
    // must carry the surrounding quotes (e.g. "'2026-04-01'").
    const rows = await runAndWait(WALLETS_QUERY_ID, {
        start_date: `'${startDate}'`,
        end_date: `'${endDate}'`,
    });
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
                        snapshotDate: periodDate,
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

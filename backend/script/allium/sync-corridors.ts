/**
 * Sync cross-country stablecoin corridor transactions from Allium.
 *
 * Stores one aggregated snapshot per corridor (sender × receiver × token)
 * per month in TransactionModel (type: 'corridor'). Re-running within the
 * same month is idempotent via upsert on the synthetic transactionId.
 *
 * Defaults to the previous calendar month. Pass --year=YYYY --month=M to
 * target a specific month (useful for backfills).
 *
 * Usage:
 *   npm run allium:sync:corridors
 *   npm run allium:sync:corridors:local
 *   npm run allium:sync:corridors -- --year=2026 --month=3
 */

import mongoose from 'mongoose';
import { TransactionModel } from '../../src/infrastructure/database/mongoose/models/TransactionModel';
import { resolveCountryId } from '../shared/iso3166';
import {
    assertApiKey,
    DB_URL,
    CORRIDORS_QUERY_ID,
    runAndWait,
    type ResultRow,
} from './_client';

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

function toNumber(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const n = Number(value.replace(/,/g, ''));
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

interface ParsedRow {
    senderCountryId: string;
    receiverCountryId: string;
    tokenSymbol: string;
    transactionCount: number;
    totalUsdVolume: number;
    usdStablecoinVolume: number;
    pctUsdStablecoins: number;
}

function parseRow(row: ResultRow): ParsedRow | null {
    const senderName = row['sender_country'];
    const receiverName = row['receiver_country'];
    const tokenSymbol = row['token_symbol'];
    const transactionCount = toNumber(row['transaction_count']);
    const totalUsdVolume = toNumber(row['total_usd_volume']);
    const usdStablecoinVolume = toNumber(row['usd_stablecoin_volume']);
    const pctUsdStablecoins = toNumber(row['pct_usd_stablecoins']);

    if (
        typeof senderName !== 'string' ||
        typeof receiverName !== 'string' ||
        typeof tokenSymbol !== 'string' ||
        transactionCount === null ||
        totalUsdVolume === null ||
        usdStablecoinVolume === null ||
        pctUsdStablecoins === null
    ) {
        return null;
    }

    const senderCountryId = resolveCountryId(senderName);
    const receiverCountryId = resolveCountryId(receiverName);

    if (senderCountryId === null || receiverCountryId === null) {
        return null;
    }

    return {
        senderCountryId,
        receiverCountryId,
        tokenSymbol: String(tokenSymbol).toUpperCase(),
        transactionCount,
        totalUsdVolume,
        usdStablecoinVolume,
        pctUsdStablecoins,
    };
}

export async function run(year?: number, month?: number): Promise<void> {
    const startTime = Date.now();

    const args = parseArgs();
    const targetYear = year ?? args.year;
    const targetMonth = month ?? args.month;
    const period = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const periodDate = new Date(`${period}-01T00:00:00.000Z`);

    console.log(`Fetching corridor data from Allium for period ${period}...`);

    // Allium requires year and month as strings
    const rows = await runAndWait(CORRIDORS_QUERY_ID, {
        year: String(targetYear),
        month: String(targetMonth),
    });
    console.log(`Received ${rows.length} row(s) from Allium.`);

    if (rows.length === 0) {
        console.warn('No rows returned, nothing to store.');
        return;
    }

    const now = new Date();
    let matched = 0;
    let unresolved = 0;
    const ops: Parameters<typeof TransactionModel.bulkWrite>[0] = [];

    for (const row of rows) {
        const parsed = parseRow(row);
        if (parsed === null) {
            unresolved++;
            const sender = row['sender_country'];
            const receiver = row['receiver_country'];
            if (
                resolveCountryId(String(sender)) === null ||
                resolveCountryId(String(receiver)) === null
            ) {
                console.warn(`Unresolved corridor: "${String(sender)}" → "${String(receiver)}"`);
            }
            continue;
        }

        const transactionId = `allium:corridor:${period}:${parsed.senderCountryId}:${parsed.receiverCountryId}:${parsed.tokenSymbol}`;

        matched++;
        ops.push({
            updateOne: {
                filter: { transactionId },
                update: {
                    $set: {
                        transactionId,
                        senderCountryId: parsed.senderCountryId,
                        receiverCountryId: parsed.receiverCountryId,
                        date: periodDate,
                        type: 'corridor',
                        value: { amount: parsed.totalUsdVolume, currency: 'USD' },
                        tokenSymbol: parsed.tokenSymbol,
                        transactionCount: parsed.transactionCount,
                        usdStablecoinVolume: parsed.usdStablecoinVolume,
                        pctUsdStablecoins: parsed.pctUsdStablecoins,
                        period,
                        source: 'allium',
                        syncedAt: now,
                    },
                },
                upsert: true,
            },
        });
    }

    if (ops.length > 0) {
        const result = await TransactionModel.bulkWrite(ops, { ordered: false });
        console.log(`Upserted ${result.upsertedCount}, modified ${result.modifiedCount}.`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Allium corridor sync complete in ${elapsed}s`);
    console.log(`Period:             ${period}`);
    console.log(`Corridors written:  ${matched}`);
    console.log(`Unresolved rows:    ${unresolved}`);
}

if (process.argv[1]?.endsWith('sync-corridors.js')) {
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

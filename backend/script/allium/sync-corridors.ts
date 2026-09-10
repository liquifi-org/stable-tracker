/**
 * Sync cross-country stablecoin corridor transactions from Allium.
 *
 * Uses Visa-methodology adjusted volume (`is_adjusted_volume` on
 * `stablecoins.intelligence.enriched_transfers`). Stores one snapshot per
 * corridor (sender × receiver × token) per month. Each period is a replace:
 * upsert the new set, then delete leftover raw rows for that month.
 *
 * Defaults to the previous calendar month. Pass --year=YYYY --month=M for one
 * month, or --from=YYYY-MM --to=YYYY-MM for a contiguous backfill.
 *
 * Usage:
 *   npm run allium:sync:corridors
 *   npm run allium:sync:corridors:local
 *   npm run allium:sync:corridors -- --year=2026 --month=8
 *   npm run allium:sync:corridors -- --from=2025-01 --to=2026-08
 */

import mongoose from 'mongoose';
import { TransactionModel } from '../../src/infrastructure/database/mongoose/models/TransactionModel';
import { resolveCountryId } from '../shared/iso3166';
import {
    assertApiKey,
    DB_URL,
    CORRIDORS_QUERY_ID,
    CORRIDORS_RUN_LIMIT,
    runAndWait,
    type ResultRow,
} from './_client';

interface YearMonth {
    year: number;
    month: number;
}

function previousCalendarMonth(): YearMonth {
    const prev = new Date();
    prev.setUTCDate(1);
    prev.setUTCMonth(prev.getUTCMonth() - 1);
    return { year: prev.getUTCFullYear(), month: prev.getUTCMonth() + 1 };
}

function parseYearMonth(value: string): YearMonth {
    const match = value.match(/^(\d{4})-(\d{1,2})$/);
    if (!match) {
        throw new Error(`Expected YYYY-MM, got "${value}"`);
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) {
        throw new Error(`Month out of range in "${value}"`);
    }
    return { year, month };
}

function enumerateMonths(from: YearMonth, to: YearMonth): YearMonth[] {
    const months: YearMonth[] = [];
    let year = from.year;
    let month = from.month;
    while (year < to.year || (year === to.year && month <= to.month)) {
        months.push({ year, month });
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    return months;
}

/** Parse --year/--month or --from/--to; defaults to the previous calendar month. */
function parseArgs(): YearMonth[] {
    const args = process.argv.slice(2);
    let year: number | undefined;
    let month: number | undefined;
    let from: YearMonth | undefined;
    let to: YearMonth | undefined;

    for (const arg of args) {
        const yearMatch = arg.match(/^--year=(\d{4})$/);
        const monthMatch = arg.match(/^--month=(\d{1,2})$/);
        const fromMatch = arg.match(/^--from=(\d{4}-\d{1,2})$/);
        const toMatch = arg.match(/^--to=(\d{4}-\d{1,2})$/);
        if (yearMatch) year = Number(yearMatch[1]);
        if (monthMatch) month = Number(monthMatch[1]);
        if (fromMatch) from = parseYearMonth(fromMatch[1]);
        if (toMatch) to = parseYearMonth(toMatch[1]);
    }

    if (from || to) {
        if (!from || !to) {
            throw new Error('Both --from=YYYY-MM and --to=YYYY-MM are required together.');
        }
        return enumerateMonths(from, to);
    }

    if (year === undefined || month === undefined) {
        return [previousCalendarMonth()];
    }
    return [{ year, month }];
}

/** "YYYY-MM-DD" for the first day of the given year/month. */
function startOfMonth(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * Exclusive end date for Allium: first day of the month after `year`/`month`.
 * SQL is `block_timestamp >= start_date AND block_timestamp < end_date`, so
 * August must use end_date 2026-09-01 (not 2026-08-31, which drops the last day).
 */
function startOfNextMonth(year: number, month: number): string {
    const next = new Date(Date.UTC(year, month, 1));
    return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
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

function corridorKey(row: ParsedRow): string {
    return `${row.senderCountryId}:${row.receiverCountryId}:${row.tokenSymbol}`;
}

function transactionIdFor(period: string, row: ParsedRow): string {
    return `allium:corridor:${period}:${row.senderCountryId}:${row.receiverCountryId}:${row.tokenSymbol}`;
}

/**
 * Allium can emit the same token under mixed casings (USDT vs USDt). Uppercase
 * first, then sum volumes so a $2k leftover cannot last-write-wins a $1.28B row.
 */
function collapseByToken(rows: ParsedRow[]): ParsedRow[] {
    const merged = new Map<string, ParsedRow>();
    for (const row of rows) {
        const key = corridorKey(row);
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, { ...row });
            continue;
        }
        existing.transactionCount += row.transactionCount;
        existing.totalUsdVolume += row.totalUsdVolume;
        existing.usdStablecoinVolume += row.usdStablecoinVolume;
        existing.pctUsdStablecoins =
            existing.totalUsdVolume > 0
                ? (existing.usdStablecoinVolume / existing.totalUsdVolume) * 100
                : 0;
    }
    return [...merged.values()];
}

async function syncPeriod(targetYear: number, targetMonth: number): Promise<void> {
    const startTime = Date.now();
    const period = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const periodDate = new Date(`${period}-01T00:00:00.000Z`);
    const startDate = startOfMonth(targetYear, targetMonth);
    const endDate = startOfNextMonth(targetYear, targetMonth);

    console.log(`Fetching adjusted corridor data from Allium for ${startDate} → ${endDate}...`);

    // Allium interpolates these raw into SQL, so the parameter value itself
    // must carry the surrounding quotes (e.g. "'2026-04-01'").
    const rows = await runAndWait(
        CORRIDORS_QUERY_ID,
        {
            start_date: `'${startDate}'`,
            end_date: `'${endDate}'`,
        },
        CORRIDORS_RUN_LIMIT,
    );
    console.log(`Received ${rows.length} row(s) from Allium.`);

    if (rows.length >= CORRIDORS_RUN_LIMIT) {
        throw new Error(
            `Allium returned ${rows.length} rows, hitting CORRIDORS_RUN_LIMIT=${CORRIDORS_RUN_LIMIT}. Raise the limit and re-run ${period}.`,
        );
    }

    if (rows.length === 0) {
        console.warn(`No rows returned for ${period}; leaving existing documents untouched.`);
        return;
    }

    const now = new Date();
    let unresolved = 0;
    const parsedRows: ParsedRow[] = [];

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
        parsedRows.push(parsed);
    }

    const collapsed = collapseByToken(parsedRows);
    const collapsedAway = parsedRows.length - collapsed.length;
    if (collapsedAway > 0) {
        console.log(`Collapsed ${collapsedAway} mixed-case token duplicate(s).`);
    }

    const keepIds = new Set<string>();
    const ops: Parameters<typeof TransactionModel.bulkWrite>[0] = [];
    for (const parsed of collapsed) {
        const transactionId = transactionIdFor(period, parsed);
        keepIds.add(transactionId);
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
                        volumeKind: 'adjusted',
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

    const deleted = await TransactionModel.deleteMany({
        type: 'corridor',
        source: 'allium',
        period,
        transactionId: { $nin: [...keepIds] },
    });
    if (deleted.deletedCount > 0) {
        console.log(`Removed ${deleted.deletedCount} leftover raw corridor row(s) for ${period}.`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const volume = collapsed.reduce((sum, row) => sum + row.totalUsdVolume, 0);
    console.log(`Allium adjusted corridor sync complete in ${elapsed}s`);
    console.log(`Period:             ${period}`);
    console.log(`Corridors written:  ${collapsed.length}`);
    console.log(`Volume USD:         ${volume.toFixed(0)}`);
    console.log(`Unresolved rows:    ${unresolved}`);
}

export async function run(year?: number, month?: number): Promise<void> {
    const months = year !== undefined && month !== undefined ? [{ year, month }] : parseArgs();
    for (let i = 0; i < months.length; i++) {
        const { year: y, month: m } = months[i];
        console.log(`\n=== ${y}-${String(m).padStart(2, '0')} (${i + 1}/${months.length}) ===`);
        await syncPeriod(y, m);
    }
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

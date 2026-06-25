/**
 * Sync the average EUR/USD exchange rate for a given month from Frankfurter
 * (ECB reference rates). Free, no API key required.
 *
 * Averages only the days the ECB actually published a rate for (weekends/EU
 * holidays have none — dividing by calendar days would skew the average).
 * For the current, still-in-progress month, the range is automatically
 * clamped to today, so the stored value is "the average so far this month".
 *
 * Usage:
 *   npm run exchange-rates:sync
 *   npm run exchange-rates:sync:local
 *   npm run exchange-rates:sync -- --year=2026 --month=6
 */

import mongoose from 'mongoose';
import { ExchangeRateModel } from '../../src/infrastructure/database/mongoose/models/ExchangeRateModel';

const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017/sc-tracker';
const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1';

interface FrankfurterRangeResponse {
    base: string;
    start_date: string;
    end_date: string;
    rates: Record<string, { USD: number }>;
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

/** "YYYY-MM-DD" for the last day of the month, clamped to today if the month is still in progress. */
function endOfMonthClamped(year: number, month: number): string {
    const lastDay = new Date(Date.UTC(year, month, 0));
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
    const end = lastDay < today ? lastDay : today;
    return end.toISOString().slice(0, 10);
}

export async function run(year?: number, month?: number): Promise<void> {
    const startTime = Date.now();

    const args = parseArgs();
    const targetYear = year ?? args.year;
    const targetMonth = month ?? args.month;
    const period = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const periodDate = new Date(`${period}-01T00:00:00.000Z`);

    const startDate = startOfMonth(targetYear, targetMonth);
    const endDate = endOfMonthClamped(targetYear, targetMonth);

    if (endDate < startDate) {
        console.warn(`${period} is entirely in the future — nothing to fetch.`);
        return;
    }

    console.log(`Fetching EUR/USD rates from Frankfurter for ${startDate} → ${endDate}...`);

    const response = await fetch(`${FRANKFURTER_URL}/${startDate}..${endDate}?from=EUR&to=USD`);
    if (!response.ok) {
        throw new Error(`Frankfurter API failed: HTTP ${response.status}`);
    }
    const body = (await response.json()) as FrankfurterRangeResponse;

    const dailyRates = Object.values(body.rates).map((r) => r.USD);
    if (dailyRates.length === 0) {
        console.warn('No published rates in this range, nothing to store.');
        return;
    }

    const average = dailyRates.reduce((sum, r) => sum + r, 0) / dailyRates.length;

    await ExchangeRateModel.updateOne(
        { referenceAsset: 'USD', currencyOriginal: 'EUR', date: periodDate },
        { $set: { usdExchangeRate: average } },
        { upsert: true },
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Exchange rate sync complete in ${elapsed}s`);
    console.log(`Period:          ${period}`);
    console.log(`Days averaged:   ${dailyRates.length}`);
    console.log(`EUR/USD average: ${average.toFixed(4)}`);
}

if (process.argv[1]?.endsWith('sync-exchange-rates.js')) {
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

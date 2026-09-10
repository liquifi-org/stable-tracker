/**
 * Sync services-import outflows onto each country.
 *
 * Cascade:
 *   1. World Bank BM.GSR.NFSV.CD (service imports, BoP, current US$)
 *      — latest non-empty year, 2018 or newer
 *   2. Pinned national last-resort figures (Taiwan CBC services debit)
 *
 * Zero, null, and pre-2018 World Bank values are not stored. European Union
 * (999) is skipped. Goods imports are deliberately not stored: they rebuild
 * GDP and are not a payments basket.
 *
 * Usage:
 *   npm run services:sync
 *   npm run services:sync:local
 */

import mongoose from 'mongoose';
import { CountryModel } from '../../src/infrastructure/database/mongoose/models/CountryModel';
import { resolveCountryId } from '../shared/iso3166';

const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017/sc-tracker';
const EU_AGGREGATE_ID = '999';
const UA = 'stable-tracker/1.0 (https://stabletracker.org; services-sync)';
const MIN_YEAR = 2018;

const WB_SERVICES =
    'https://api.worldbank.org/v2/country/all/indicator/BM.GSR.NFSV.CD' +
    '?format=json&mrnev=1&per_page=400';

/** Used only if every live source fails. Values checked September 2026. */
const LAST_RESORT: Record<string, { value: number; year: number; source: string }> = {
    // CBC Annual Report 2024: services debit (imports) US$71,162 million.
    '158': { value: 71.162e9, year: 2024, source: 'cbc-bop' },
};

interface WorldBankEntry {
    country: { id: string; value: string };
    countryiso3code: string;
    date: string;
    value: number | null;
}

type WorldBankResponse = [unknown, WorldBankEntry[] | null];

interface ServicesCandidate {
    countryId: string;
    value: number;
    year: number;
    source: string;
}

const SOURCE_RANK: Record<string, number> = {
    'world-bank': 50,
    'cbc-bop': 20,
};

function sourceRank(source: string): number {
    return SOURCE_RANK[source] ?? 0;
}

function better(next: ServicesCandidate, prev: ServicesCandidate | undefined): boolean {
    if (!prev) return true;
    if (prev.source === 'world-bank' && next.source !== 'world-bank') return false;
    if (next.source === 'world-bank' && prev.source !== 'world-bank') return true;
    if (next.year !== prev.year) return next.year > prev.year;
    return sourceRank(next.source) > sourceRank(prev.source);
}

async function fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!response.ok) {
        throw new Error(`${url} → HTTP ${response.status}`);
    }
    return response.json();
}

async function fetchWorldBank(): Promise<ServicesCandidate[]> {
    const body = (await fetchJson(WB_SERVICES)) as WorldBankResponse;
    const entries = body[1];
    if (!entries) throw new Error('World Bank API returned no data array (services).');

    const out: ServicesCandidate[] = [];
    for (const entry of entries) {
        if (entry.value == null || entry.value <= 0) continue;
        const year = Number(entry.date);
        if (year < MIN_YEAR) continue;
        const countryId =
            resolveCountryId(entry.countryiso3code) ?? resolveCountryId(entry.country?.value);
        if (countryId === null || countryId === EU_AGGREGATE_ID) continue;
        out.push({ countryId, value: entry.value, year, source: 'world-bank' });
    }
    return out;
}

function merge(into: Map<string, ServicesCandidate>, incoming: ServicesCandidate[]): void {
    for (const row of incoming) {
        const prev = into.get(row.countryId);
        if (better(row, prev)) into.set(row.countryId, row);
    }
}

export async function run(): Promise<void> {
    const startTime = Date.now();
    const countries = await CountryModel.find({}, { countryId: 1, name: 1 }).lean();
    const realCountries = countries.filter((c) => c.countryId !== EU_AGGREGATE_ID);
    console.log(`Countries in DB: ${countries.length} (skipping ${EU_AGGREGATE_ID} EU aggregate)`);

    const chosen = new Map<string, ServicesCandidate>();

    console.log('1/2 World Bank BM.GSR.NFSV.CD…');
    const services = await fetchWorldBank();
    merge(chosen, services);
    console.log(`   ${services.length} services-import series`);

    console.log('2/2 last-resort pins…');
    merge(
        chosen,
        Object.entries(LAST_RESORT).map(([countryId, pin]) => ({ countryId, ...pin })),
    );

    const now = new Date();
    const ops: Parameters<typeof CountryModel.bulkWrite>[0] = [];
    const bySource = new Map<string, number>();
    for (const row of chosen.values()) {
        bySource.set(row.source, (bySource.get(row.source) ?? 0) + 1);
        ops.push({
            updateOne: {
                filter: { countryId: row.countryId },
                update: {
                    $set: {
                        servicesImports: row.value,
                        servicesImportsYear: row.year,
                        servicesImportsSource: row.source,
                        servicesImportsSyncedAt: now,
                    },
                },
                upsert: false,
            },
        });
    }

    const filledIds = [...chosen.keys()];
    ops.push({
        updateMany: {
            filter: {
                countryId: { $nin: [...filledIds, EU_AGGREGATE_ID] },
                servicesImports: { $in: [0, null] },
            },
            update: {
                $unset: {
                    servicesImports: 1,
                    servicesImportsYear: 1,
                    servicesImportsSource: 1,
                    servicesImportsSyncedAt: 1,
                },
            },
        },
    });

    if (ops.length > 0) {
        const result = await CountryModel.bulkWrite(ops, { ordered: false });
        console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount}.`);
    }

    const uncovered = realCountries.filter((c) => !chosen.has(c.countryId));
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Services-import sync complete in ${elapsed}s`);
    console.log(`Filled: ${chosen.size} / ${realCountries.length}`);
    console.log(
        'Sources:',
        [...bySource.entries()].map(([k, n]) => `${k}=${n}`).join(', '),
    );
    const interesting = ['158', '364', '804', '484'];
    for (const id of interesting) {
        const row = chosen.get(id);
        const name = realCountries.find((c) => c.countryId === id)?.name ?? id;
        if (row) {
            console.log(`  ${name}: ${row.value} (${row.year}, ${row.source})`);
        } else {
            console.warn(`  UNFILLED ${id} ${name}`);
        }
    }
    if (uncovered.length > 0) {
        console.log(`Still empty: ${uncovered.length} (no official series from ${MIN_YEAR})`);
    }
}

if (process.argv[1]?.endsWith('sync-services.js')) {
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

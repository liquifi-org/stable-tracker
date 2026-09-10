/**
 * Sync remittance outflows onto each country.
 *
 * Cascade:
 *   1. World Bank BM.TRF.PWKR.CD.DT (personal remittances paid)
 *   2. World Bank BM.TRF.PRVT.CD (secondary income, other sectors, payments)
 *      for gaps with a recent year — used when the personal-remittances series
 *      is unpublished (Singapore is the usual case)
 *   3. Pinned national last-resort figures (Taiwan CBC secondary-income payments)
 *
 * Zero and null World Bank values are not stored. European Union (999) is skipped.
 *
 * Usage:
 *   npm run remittances:sync
 *   npm run remittances:sync:local
 */

import mongoose from 'mongoose';
import { CountryModel } from '../../src/infrastructure/database/mongoose/models/CountryModel';
import { resolveCountryId } from '../shared/iso3166';

const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017/sc-tracker';
const EU_AGGREGATE_ID = '999';
const UA = 'stable-tracker/1.0 (https://stabletracker.org; remittances-sync)';
const MIN_FALLBACK_YEAR = 2018;

const WB_PERSONAL =
    'https://api.worldbank.org/v2/country/all/indicator/BM.TRF.PWKR.CD.DT' +
    '?format=json&mrnev=1&per_page=400';
const WB_SECONDARY =
    'https://api.worldbank.org/v2/country/all/indicator/BM.TRF.PRVT.CD' +
    '?format=json&mrnev=1&per_page=400';

/** Used only if every live source fails. Values checked September 2026. */
const LAST_RESORT: Record<string, { value: number; year: number; source: string }> = {
    // CBC Annual Report 2024: secondary income payments US$13,752 million.
    // Broader than personal remittances; workers' outward remittances are the main cited driver.
    '158': { value: 13.752e9, year: 2024, source: 'cbc-bop' },
};

interface WorldBankEntry {
    country: { id: string; value: string };
    countryiso3code: string;
    date: string;
    value: number | null;
}

type WorldBankResponse = [unknown, WorldBankEntry[] | null];

interface RemitCandidate {
    countryId: string;
    value: number;
    year: number;
    source: string;
}

const SOURCE_RANK: Record<string, number> = {
    'world-bank': 50,
    'world-bank-secondary-income': 25,
    'cbc-bop': 20,
};

function sourceRank(source: string): number {
    return SOURCE_RANK[source] ?? 0;
}

function better(next: RemitCandidate, prev: RemitCandidate | undefined): boolean {
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

async function fetchWorldBank(url: string, source: string): Promise<RemitCandidate[]> {
    const body = (await fetchJson(url)) as WorldBankResponse;
    const entries = body[1];
    if (!entries) throw new Error(`World Bank API returned no data array (${source}).`);

    const out: RemitCandidate[] = [];
    for (const entry of entries) {
        if (entry.value == null || entry.value <= 0) continue;
        const year = Number(entry.date);
        if (source !== 'world-bank' && year < MIN_FALLBACK_YEAR) continue;
        const countryId =
            resolveCountryId(entry.countryiso3code) ?? resolveCountryId(entry.country?.value);
        if (countryId === null || countryId === EU_AGGREGATE_ID) continue;
        out.push({ countryId, value: entry.value, year, source });
    }
    return out;
}

function merge(into: Map<string, RemitCandidate>, incoming: RemitCandidate[]): void {
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

    const chosen = new Map<string, RemitCandidate>();

    console.log('1/3 World Bank BM.TRF.PWKR.CD.DT…');
    const personal = await fetchWorldBank(WB_PERSONAL, 'world-bank');
    merge(chosen, personal);
    console.log(`   ${personal.length} personal-remittance series`);

    const missingAfterPersonal = realCountries.filter((c) => !chosen.has(c.countryId));
    if (missingAfterPersonal.length > 0) {
        console.log(`2/3 World Bank BM.TRF.PRVT.CD for ${missingAfterPersonal.length} gap(s)…`);
        const secondary = await fetchWorldBank(WB_SECONDARY, 'world-bank-secondary-income');
        const gapIds = new Set(missingAfterPersonal.map((c) => c.countryId));
        merge(chosen, secondary.filter((row) => gapIds.has(row.countryId)));
    } else {
        console.log('2/3 secondary-income fallback skipped (no personal-remittance gaps)');
    }

    console.log('3/3 last-resort pins…');
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
                        remittancesSent: row.value,
                        remittancesYear: row.year,
                        remittancesSource: row.source,
                        remittancesSyncedAt: now,
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
                remittancesSent: { $in: [0, null] },
            },
            update: {
                $unset: {
                    remittancesSent: 1,
                    remittancesYear: 1,
                    remittancesSource: 1,
                    remittancesSyncedAt: 1,
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
    console.log(`Remittances sync complete in ${elapsed}s`);
    console.log(`Filled: ${chosen.size} / ${realCountries.length}`);
    console.log(
        'Sources:',
        [...bySource.entries()].map(([k, n]) => `${k}=${n}`).join(', '),
    );
    const interesting = ['158', '364', '702', '170'];
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
        console.log(`Still empty: ${uncovered.length} (no official series)`);
    }
}

if (process.argv[1]?.endsWith('sync-remittances.js')) {
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

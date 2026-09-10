/**
 * Sync country population onto each country.
 *
 * Cascade, newest year wins among fallbacks (World Bank always wins when present):
 *   1. World Bank SP.POP.TOTL (latest non-empty)
 *   2. CIA World Factbook People and Society → Population
 *   3. Wikipedia demographics / country infobox
 *   4. Pinned last-resort figures for remaining territories
 *
 * European Union (999) is a licence aggregate — skipped.
 *
 * Usage:
 *   npm run population:sync
 *   npm run population:sync:local
 */

import mongoose from 'mongoose';
import { CountryModel } from '../../src/infrastructure/database/mongoose/models/CountryModel';
import { resolveCountryId } from '../shared/iso3166';
import { parseFactbookPopulation, parseWikipediaPopulation } from './popMoney';

const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017/sc-tracker';
const EU_AGGREGATE_ID = '999';
const UA = 'stable-tracker/1.0 (https://stabletracker.org; population-sync)';

const WORLD_BANK_URL =
    'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL' +
    '?format=json&mrnev=1&per_page=400';

/** FIPS-style Factbook paths for countries World Bank does not publish. */
const FACTBOOK_PATHS: Record<string, string> = {
    '158': 'east-n-southeast-asia/tw.json',
    '408': 'east-n-southeast-asia/kn.json',
    '092': 'central-america-n-caribbean/vi.json',
    '666': 'north-america/sb.json',
    '570': 'australia-oceania/ne.json',
    '336': 'europe/vt.json',
    '732': 'africa/wi.json',
};

const WIKIPEDIA_PAGES: Record<string, string> = {
    '158': 'Demographics_of_Taiwan',
    '408': 'Demographics_of_North_Korea',
    '336': 'Vatican_City',
    '570': 'Niue',
    '092': 'British_Virgin_Islands',
    '666': 'Saint_Pierre_and_Miquelon',
    '732': 'Western_Sahara',
};

/** Used only if every live source fails. Values checked September 2026. */
const LAST_RESORT: Record<string, { value: number; year: number; source: string }> = {
    '158': { value: 23_243_565, year: 2026, source: 'wikipedia' },
    '408': { value: 26_298_666, year: 2024, source: 'cia-factbook' },
    '092': { value: 40_537, year: 2024, source: 'cia-factbook' },
    '666': { value: 5_819, year: 2023, source: 'cia-factbook' },
    '570': { value: 2_000, year: 2024, source: 'cia-factbook' },
    '336': { value: 764, year: 2024, source: 'cia-factbook' },
    '732': { value: 652_271, year: 2024, source: 'cia-factbook' },
};

interface WorldBankEntry {
    country: { id: string; value: string };
    countryiso3code: string;
    date: string;
    value: number | null;
}

type WorldBankResponse = [unknown, WorldBankEntry[] | null];

interface PopCandidate {
    countryId: string;
    value: number;
    year: number;
    source: string;
}

const SOURCE_RANK: Record<string, number> = {
    'world-bank': 50,
    'cia-factbook': 30,
    wikipedia: 20,
};

function sourceRank(source: string): number {
    return SOURCE_RANK[source] ?? 0;
}

function better(next: PopCandidate, prev: PopCandidate | undefined): boolean {
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

async function fetchWorldBank(): Promise<PopCandidate[]> {
    const body = (await fetchJson(WORLD_BANK_URL)) as WorldBankResponse;
    const entries = body[1];
    if (!entries) throw new Error('World Bank API returned no data array.');

    const out: PopCandidate[] = [];
    for (const entry of entries) {
        if (entry.value === null || entry.value <= 0) continue;
        const countryId =
            resolveCountryId(entry.countryiso3code) ?? resolveCountryId(entry.country?.value);
        if (countryId === null || countryId === EU_AGGREGATE_ID) continue;
        out.push({
            countryId,
            value: entry.value,
            year: Number(entry.date),
            source: 'world-bank',
        });
    }
    return out;
}

interface FactbookFile {
    'People and Society'?: Record<string, unknown>;
}

async function fetchFactbook(countryId: string): Promise<PopCandidate | null> {
    const path = FACTBOOK_PATHS[countryId];
    if (!path) return null;
    const url = `https://raw.githubusercontent.com/factbook/factbook.json/master/${path}`;
    try {
        const file = (await fetchJson(url)) as FactbookFile;
        const parsed = parseFactbookPopulation(file['People and Society']?.Population);
        if (!parsed || parsed.value <= 0) return null;
        return {
            countryId,
            value: parsed.value,
            year: parsed.year ?? 2020,
            source: 'cia-factbook',
        };
    } catch (err) {
        console.warn(`  Factbook miss ${countryId}:`, err instanceof Error ? err.message : err);
        return null;
    }
}

async function fetchWikipedia(countryId: string, fallbackName: string): Promise<PopCandidate | null> {
    const title = WIKIPEDIA_PAGES[countryId]
        ?? `Demographics_of_${fallbackName.replace(/\s+/g, '_')}`;
    const url =
        'https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2'
        + `&page=${encodeURIComponent(title)}`;
    try {
        const body = (await fetchJson(url)) as { parse?: { wikitext?: string } };
        const wikitext = body.parse?.wikitext;
        if (!wikitext) return null;
        const parsed = parseWikipediaPopulation(wikitext);
        if (!parsed || parsed.value <= 0) return null;
        return {
            countryId,
            value: parsed.value,
            year: parsed.year ?? 2021,
            source: 'wikipedia',
        };
    } catch (err) {
        console.warn(`  Wikipedia miss ${countryId}:`, err instanceof Error ? err.message : err);
        return null;
    }
}

function merge(into: Map<string, PopCandidate>, incoming: PopCandidate[]): void {
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

    const chosen = new Map<string, PopCandidate>();

    console.log('1/4 World Bank SP.POP.TOTL…');
    const wb = await fetchWorldBank();
    merge(chosen, wb);
    console.log(`   ${wb.length} series, ${chosen.size} countries after WB`);

    const missingAfterWb = realCountries.filter((c) => !chosen.has(c.countryId));
    if (missingAfterWb.length > 0) {
        console.log(`2/4 CIA Factbook for ${missingAfterWb.length} gap(s)…`);
        for (const c of missingAfterWb) {
            const row = await fetchFactbook(c.countryId);
            if (row) merge(chosen, [row]);
        }
    } else {
        console.log('2/4 CIA Factbook skipped (no WB gaps)');
    }

    const missingAfterCia = realCountries.filter((c) => !chosen.has(c.countryId));
    if (missingAfterCia.length > 0) {
        console.log(`3/4 Wikipedia demographics for ${missingAfterCia.length} gap(s)…`);
        for (const c of missingAfterCia) {
            const row = await fetchWikipedia(c.countryId, c.name);
            if (row) merge(chosen, [row]);
        }
    } else {
        console.log('3/4 Wikipedia skipped (no remaining gaps)');
    }

    // Prefer a newer Wikipedia year on WB-missing countries Factbook already filled (Taiwan).
    for (const c of missingAfterWb) {
        if (!WIKIPEDIA_PAGES[c.countryId] || !chosen.has(c.countryId)) continue;
        const row = await fetchWikipedia(c.countryId, c.name);
        if (row) merge(chosen, [row]);
    }

    console.log('4/4 last-resort pins (used when newer, or still empty)…');
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
                        population: row.value,
                        populationYear: row.year,
                        populationSource: row.source,
                        populationSyncedAt: now,
                    },
                },
                upsert: false,
            },
        });
    }

    if (ops.length > 0) {
        const result = await CountryModel.bulkWrite(ops, { ordered: false });
        console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount}.`);
    }

    const uncovered = realCountries.filter((c) => !chosen.has(c.countryId));
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Population sync complete in ${elapsed}s`);
    console.log(`Filled: ${chosen.size} / ${realCountries.length}`);
    console.log(
        'Sources:',
        [...bySource.entries()].map(([k, n]) => `${k}=${n}`).join(', '),
    );
    if (uncovered.length > 0) {
        for (const c of uncovered) {
            console.warn(`  UNFILLED ${c.countryId} ${c.name}`);
        }
    }
}

if (process.argv[1]?.endsWith('sync-population.js')) {
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

/**
 * Sync nominal GDP (current USD) onto each country.
 *
 * Cascade, newest year wins:
 *   1. World Bank NY.GDP.MKTP.CD (latest non-empty)
 *   2. CIA World Factbook official exchange-rate GDP (factbook.json)
 *   3. CIA Factbook real GDP PPP, only if no nominal figure exists
 *   4. Wikipedia "Economy of …" infobox (IMF / national stats citations)
 *   5. Pinned last-resort figures for the remaining territories
 *
 * European Union (999) is a licence aggregate, not an economy — skipped.
 *
 * Usage:
 *   npm run gdp:sync
 *   npm run gdp:sync:local
 */

import mongoose from 'mongoose';
import { CountryModel } from '../../src/infrastructure/database/mongoose/models/CountryModel';
import { resolveCountryId } from '../shared/iso3166';
import { parseFactbookGdp, parseGdpAmount, parseWikipediaGdp } from './gdpMoney';

const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017/sc-tracker';
const EU_AGGREGATE_ID = '999';
const UA = 'stable-tracker/1.0 (https://stabletracker.org; gdp-sync)';

const WORLD_BANK_URL =
    'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD' +
    '?format=json&mrnev=1&per_page=400';

/** FIPS-style Factbook paths for countries World Bank does not publish. */
const FACTBOOK_PATHS: Record<string, { path: string; preferPpp?: boolean }> = {
    '158': { path: 'east-n-southeast-asia/tw.json' },
    '408': { path: 'east-n-southeast-asia/kn.json' },
    '092': { path: 'central-america-n-caribbean/vi.json' },
    '666': { path: 'north-america/sb.json' },
    '570': { path: 'australia-oceania/ne.json', preferPpp: true },
    '336': { path: 'europe/vt.json' },
    '732': { path: 'africa/wi.json', preferPpp: true },
};

const WIKIPEDIA_PAGES: Record<string, string> = {
    '158': 'Economy_of_Taiwan',
    '408': 'Economy_of_North_Korea',
    '336': 'Economy_of_Vatican_City',
    '570': 'Economy_of_Niue',
    '092': 'Economy_of_the_British_Virgin_Islands',
    '666': 'Economy_of_Saint_Pierre_and_Miquelon',
    '732': 'Economy_of_Western_Sahara',
};

/** Used only if every live source fails. Values checked September 2026. */
const LAST_RESORT: Record<string, { value: number; year: number; source: string }> = {
    '158': { value: 884.39e9, year: 2025, source: 'imf-weo' },
    '408': { value: 34e9, year: 2025, source: 'bank-of-korea' },
    '092': { value: 1.598e9, year: 2024, source: 'cia-factbook' },
    '666': { value: 261.3e6, year: 2015, source: 'cia-factbook' },
    '570': { value: 24.938e6, year: 2016, source: 'wikipedia' },
    '336': { value: 19.8e6, year: 2021, source: 'wikipedia' },
    '732': { value: 908.9e6, year: 2007, source: 'cia-factbook-ppp' },
};

interface WorldBankEntry {
    country: { id: string; value: string };
    countryiso3code: string;
    date: string;
    value: number | null;
}

type WorldBankResponse = [unknown, WorldBankEntry[] | null];

interface GdpCandidate {
    countryId: string;
    value: number;
    year: number;
    source: string;
}

const SOURCE_RANK: Record<string, number> = {
    'world-bank': 50,
    'imf-weo': 40,
    'bank-of-korea': 35,
    'cia-factbook': 30,
    wikipedia: 20,
    'cia-factbook-ppp': 10,
};

function sourceRank(source: string): number {
    return SOURCE_RANK[source] ?? 0;
}

function better(next: GdpCandidate, prev: GdpCandidate | undefined): boolean {
    if (!prev) return true;
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

async function fetchWorldBank(): Promise<GdpCandidate[]> {
    const body = (await fetchJson(WORLD_BANK_URL)) as WorldBankResponse;
    const entries = body[1];
    if (!entries) throw new Error('World Bank API returned no data array.');

    const out: GdpCandidate[] = [];
    for (const entry of entries) {
        if (entry.value === null) continue;
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
    Economy?: Record<string, unknown>;
}

async function fetchFactbook(countryId: string): Promise<GdpCandidate | null> {
    const spec = FACTBOOK_PATHS[countryId];
    if (!spec) return null;
    const url = `https://raw.githubusercontent.com/factbook/factbook.json/master/${spec.path}`;
    try {
        const file = (await fetchJson(url)) as FactbookFile;
        const economy = file.Economy ?? {};
        const oer = parseFactbookGdp(economy['GDP (official exchange rate)']);
        if (oer && oer.value > 0) {
            return {
                countryId,
                value: oer.value,
                year: oer.year ?? 2020,
                source: 'cia-factbook',
            };
        }
        const ppp = parseFactbookGdp(economy['Real GDP (purchasing power parity)'])
            ?? parseFactbookGdp(economy['GDP (purchasing power parity) - real']);
        if (ppp && ppp.value > 0 && spec.preferPpp) {
            return {
                countryId,
                value: ppp.value,
                year: ppp.year ?? 2020,
                source: 'cia-factbook-ppp',
            };
        }
        return null;
    } catch (err) {
        console.warn(`  Factbook miss ${countryId}:`, err instanceof Error ? err.message : err);
        return null;
    }
}

async function fetchWikipedia(countryId: string, fallbackName: string): Promise<GdpCandidate | null> {
    const title = WIKIPEDIA_PAGES[countryId]
        ?? `Economy_of_${fallbackName.replace(/\s+/g, '_')}`;
    const url =
        'https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2'
        + `&page=${encodeURIComponent(title)}`;
    try {
        const body = (await fetchJson(url)) as { parse?: { wikitext?: string } };
        const wikitext = body.parse?.wikitext;
        if (!wikitext) return null;
        const parsed = parseWikipediaGdp(wikitext) ?? parseGdpAmount(wikitext.slice(0, 2000));
        if (!parsed || parsed.value <= 0) return null;
        const citesImf = /imf|weo/i.test(wikitext.slice(0, 2500));
        return {
            countryId,
            value: parsed.value,
            year: parsed.year ?? 2021,
            source: citesImf ? 'imf-weo' : 'wikipedia',
        };
    } catch (err) {
        console.warn(`  Wikipedia miss ${countryId}:`, err instanceof Error ? err.message : err);
        return null;
    }
}

function merge(into: Map<string, GdpCandidate>, incoming: GdpCandidate[]): void {
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

    const chosen = new Map<string, GdpCandidate>();

    console.log('1/4 World Bank NY.GDP.MKTP.CD…');
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
        console.log(`3/4 Wikipedia economy infobox for ${missingAfterCia.length} gap(s)…`);
        for (const c of missingAfterCia) {
            const row = await fetchWikipedia(c.countryId, c.name);
            if (row) merge(chosen, [row]);
        }
        // Taiwan / NK: Wikipedia often has a newer IMF/BOK year than Factbook.
        for (const c of missingAfterWb) {
            if (WIKIPEDIA_PAGES[c.countryId] && chosen.has(c.countryId)) {
                const row = await fetchWikipedia(c.countryId, c.name);
                if (row) merge(chosen, [row]);
            }
        }
    } else {
        console.log('3/4 Wikipedia skipped (no remaining gaps)');
        // Still try Wikipedia on WB-missing countries that Factbook filled, in case
        // the infobox year is newer (Taiwan IMF 2025 vs CIA 2023).
        for (const c of missingAfterWb) {
            if (!WIKIPEDIA_PAGES[c.countryId]) continue;
            const row = await fetchWikipedia(c.countryId, c.name);
            if (row) merge(chosen, [row]);
        }
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
                        gdp: row.value,
                        gdpYear: row.year,
                        gdpSource: row.source,
                        gdpSyncedAt: now,
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
    console.log(`GDP sync complete in ${elapsed}s`);
    console.log(`Filled: ${chosen.size} / ${realCountries.length}`);
    console.log(
        'Sources:',
        [...bySource.entries()].map(([k, n]) => `${k}=${n}`).join(', '),
    );
    if (uncovered.length > 0) {
        for (const c of uncovered) {
            console.error(`  UNFILLED ${c.countryId} ${c.name}`);
        }
        throw new Error(`GDP missing for ${uncovered.length} countr${uncovered.length === 1 ? 'y' : 'ies'}.`);
    }
}

if (process.argv[1]?.endsWith('sync-gdp.js')) {
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

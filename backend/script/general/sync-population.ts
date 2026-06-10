/**
 * Sync country population figures from the World Bank (indicator SP.POP.TOTL).
 * Free, no API key required. Meant to run infrequently (e.g. yearly).
 *
 * Usage:
 *   npm run population:sync
 *   npm run population:sync:local
 */

import mongoose from 'mongoose';
import { CountryModel } from '../../src/infrastructure/database/mongoose/models/CountryModel';
import { resolveCountryId } from '../shared/iso3166';

const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017/sc-tracker';

const WORLD_BANK_URL =
    'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL' +
    '?format=json&mrnev=1&per_page=400';

interface WorldBankEntry {
    country: { id: string; value: string };
    countryiso3code: string;
    date: string;
    value: number | null;
}

type WorldBankResponse = [unknown, WorldBankEntry[] | null];

async function fetchPopulation(): Promise<WorldBankEntry[]> {
    const response = await fetch(WORLD_BANK_URL);
    if (!response.ok) {
        throw new Error(`World Bank API failed: HTTP ${response.status}`);
    }
    const body = (await response.json()) as WorldBankResponse;
    const entries = body[1];
    if (!entries) {
        throw new Error('World Bank API returned no data array.');
    }
    return entries;
}

export async function run(): Promise<void> {
    const startTime = Date.now();
    console.log('Fetching population figures from the World Bank...');

    const entries = await fetchPopulation();
    console.log(`Received ${entries.length} entry(ies).`);

    const now = new Date();
    let updated = 0;
    let skipped = 0;
    const ops: Parameters<typeof CountryModel.bulkWrite>[0] = [];

    for (const entry of entries) {
        if (entry.value === null) {
            skipped++;
            continue;
        }

        // World Bank uses ISO alpha-3; aggregates (regions) won't resolve.
        const countryId =
            resolveCountryId(entry.countryiso3code) ?? resolveCountryId(entry.country?.value);

        if (countryId === null) {
            skipped++;
            continue;
        }

        ops.push({
            updateOne: {
                filter: { countryId },
                update: {
                    $set: {
                        population: entry.value,
                        populationYear: Number(entry.date),
                        populationSyncedAt: now,
                    },
                },
                upsert: false,
            },
        });
        updated++;
    }

    if (ops.length > 0) {
        const result = await CountryModel.bulkWrite(ops, { ordered: false });
        console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount}.`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Population sync complete in ${elapsed}s`);
    console.log(`Countries with population: ${updated}`);
    console.log(`Skipped (no value/aggregate): ${skipped}`);
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

// ── Standalone entry ─────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('sync-population.js')) {
    mongoose
        .connect(DB_URL)
        .then(() => {
            console.log('✓  MongoDB connected\n');
            return run();
        })
        .then(() => mongoose.disconnect())
        .catch((err) => {
            console.error('❌  Fatal:', err);
            process.exit(1);
        });
}


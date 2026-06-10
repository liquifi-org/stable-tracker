/**
 * Stride sub-script: sync issuers
 *
 * Fetches all unique issuers from the Stride API (via each country's issuer list)
 * and upserts them into MongoDB.
 *
 * NOTE: regulatedIssuerIds on each Country document is also kept in sync here.
 * Run sync-countries first (or independently) to populate country detail.
 *
 * Usage:
 *   npm run stride:sync:issuers
 *   npm run stride:sync:issuers:local
 */

import mongoose from 'mongoose';
import { IssuerModel } from '../../src/infrastructure/database/mongoose/models/IssuerModel';
import { CountryModel } from '../../src/infrastructure/database/mongoose/models/CountryModel';
import {
    assertApiKey, DB_URL, RATE_LIMIT_FLOOR,
    strideFetch, padCountryId, rateLimitRemaining, printStats,
    StrideCountryListItem, StrideIssuer,
} from './_client';

export async function run(): Promise<void> {
    const startTime = Date.now();
    console.log('📋  Fetching country list…');

    const countryList = await strideFetch<StrideCountryListItem[]>('/countries/list');
    if (!countryList) {
        console.error('❌  Failed to fetch country list. Aborting.');
        return;
    }
    console.log(`    ${countryList.length} countries\n`);

    const issuerMap = new Map<number, StrideIssuer>();

    console.log(`🏢  Collecting issuers for ${countryList.length} countries…`);
    for (const country of countryList) {
        if (rateLimitRemaining <= RATE_LIMIT_FLOOR) {
            console.warn('⚠️  Rate limit nearly exhausted — stopping early.');
            break;
        }

        const issuers = await strideFetch<StrideIssuer[]>(`/issuers/country/${country.id}`);
        if (!issuers || issuers.length === 0) continue;

        let newCount = 0;
        for (const issuer of issuers) {
            if (!issuerMap.has(issuer.id)) {
                issuerMap.set(issuer.id, issuer);
                newCount++;
            }
        }

        // Keep regulatedIssuerIds in sync
        await CountryModel.updateOne(
            { countryId: padCountryId(country.id) },
            { $set: { regulatedIssuerIds: issuers.map((i) => String(i.id)) } },
        );

        if (newCount > 0) {
            console.log(`  → ${country.name}: ${issuers.length} issuer(s) (${newCount} new)`);
        }
    }

    if (issuerMap.size === 0) {
        console.log('    No issuers found.');
        return;
    }

    // Bulk upsert
    const now = new Date();
    const ops = Array.from(issuerMap.values()).map((issuer) => ({
        updateOne: {
            filter: { issuerId: String(issuer.id) },
            update: {
                $set: {
                    name:         issuer.name,
                    officialName: issuer.official_name ?? undefined,
                    syncedAt:     now,
                },
                $setOnInsert: { originCountry: '' },
            },
            upsert: true,
        },
    }));

    await IssuerModel.bulkWrite(ops, { ordered: false });
    console.log(`\n✅  ${issuerMap.size} issuer(s) upserted in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

// ── Standalone entry ─────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('sync-issuers.js')) {
    assertApiKey();
    const startTime = Date.now();
    mongoose.connect(DB_URL)
        .then(() => { console.log('✓  MongoDB connected\n'); return run(); })
        .then(() => printStats(startTime))
        .then(() => mongoose.disconnect())
        .catch((err) => { console.error('❌  Fatal:', err); process.exit(1); });
}

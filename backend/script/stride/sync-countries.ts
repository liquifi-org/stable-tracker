/**
 * Stride sub-script: sync countries + laws + regulatedIssuerIds
 *
 * Usage:
 *   npm run stride:sync:countries
 *   npm run stride:sync:countries:local
 */

import mongoose from 'mongoose';
import { CountryModel } from '../../src/infrastructure/database/mongoose/models/CountryModel';
import { LawModel } from '../../src/infrastructure/database/mongoose/models/LawModel';
import { WorldRegion } from '../../src/domain/value-objects/WorldRegion';
import {
    assertApiKey, DB_URL, RATE_LIMIT_FLOOR,
    strideFetch, padCountryId, rateLimitRemaining, printStats,
    StrideCountryListItem, StrideCountryTableItem, StrideCountryTableResponse,
    StrideCountryDetail, StrideIssuer, StrideLaw,
} from './_client';

async function syncCountryDetail(
    listItem: StrideCountryListItem,
    tableMap: Map<number, StrideCountryTableItem>,
): Promise<void> {
    const countryId = padCountryId(listItem.id);
    const table = tableMap.get(listItem.id);

    const detail = await strideFetch<StrideCountryDetail>(`/countries/${listItem.id}`);
    if (detail === null) return;

    const isStablecoinSpecific =
        table?.is_stablecoin_specific === 1 || detail.is_stablecoin_specific === 1;
    const stage = isStablecoinSpecific ? (detail.stage ?? 0) : 0;

    await CountryModel.updateOne(
        { countryId },
        {
            $set: {
                name:                  detail.name,
                stage,
                regulatorName:         detail.regulator_name        ?? undefined,
                regulatorDescription:  detail.regulator_description ?? undefined,
                description:           detail.description           ?? undefined,
                currency:              detail.currency              ?? undefined,
                fiatBacked:            table?.fiat_backed       ?? detail.fiat_backed,
                fiatAlert:             table?.fiat_alert        ?? detail.fiat_alert        ?? undefined,
                cryptoBacked:          table?.crypto_backed     ?? detail.crypto_backed,
                cryptoAlert:           table?.crypto_alert      ?? detail.crypto_alert      ?? undefined,
                commodityBacked:       table?.commodity_backed  ?? detail.commodity_backed,
                commodityAlert:        table?.commodity_alert   ?? detail.commodity_alert   ?? undefined,
                algorithmBacked:       table?.algorithm_backed  ?? detail.algorithm_backed,
                algorithmAlert:        table?.algorithm_alert   ?? detail.algorithm_alert   ?? undefined,
                isStablecoinSpecific,
                syncedAt: new Date(),
            },
            $setOnInsert: { region: WorldRegion.OTHER },
        },
        { upsert: true },
    );
    console.log(`    ✓ Country ${countryId} (${detail.name})`);
}

export async function syncLaws(countryId: number): Promise<void> {
    const laws = await strideFetch<StrideLaw[]>(`/laws/${countryId}`);
    if (!laws || laws.length === 0) return;

    const now = new Date();
    const ops = laws.map((law) => ({
        updateOne: {
            filter: { lawId: String(law.id) },
            update: {
                $set: {
                    countryId:   padCountryId(law.country_id),
                    title:       law.title,
                    enactedDate: law.enacted_date  ?? undefined,
                    description: law.description   ?? undefined,
                    citation:    law.citation       ?? undefined,
                    syncedAt:    now,
                },
            },
            upsert: true,
        },
    }));

    await LawModel.bulkWrite(ops, { ordered: false });
    console.log(`      ✓ ${laws.length} law(s)`);
}

async function syncIssuersForCountry(countryId: number): Promise<void> {
    const issuers = await strideFetch<StrideIssuer[]>(`/issuers/country/${countryId}`);
    if (!issuers || issuers.length === 0) return;

    await CountryModel.updateOne(
        { countryId: padCountryId(countryId) },
        { $set: { regulatedIssuerIds: issuers.map((i) => String(i.id)) } },
    );
    console.log(`      ✓ ${issuers.length} regulated issuer(s) linked`);
}

export async function run(): Promise<void> {
    const startTime = Date.now();
    console.log('📋  Fetching country list and collateral table…');

    const countryList = await strideFetch<StrideCountryListItem[]>('/countries/list');
    const tableResponse = await strideFetch<StrideCountryTableResponse>('/countries/table');

    if (!countryList) {
        console.error('❌  Failed to fetch country list. Aborting.');
        return;
    }

    const tableMap = new Map<number, StrideCountryTableItem>();
    for (const item of tableResponse?.data ?? []) {
        tableMap.set(item.id, item);
    }
    console.log(`    ${countryList.length} countries · ${tableMap.size} with collateral data\n`);

    console.log(`🌍  Syncing ${countryList.length} countries…`);
    for (const country of countryList) {
        if (rateLimitRemaining <= RATE_LIMIT_FLOOR) {
            console.warn('⚠️  Rate limit nearly exhausted — stopping early.');
            break;
        }
        console.log(`  → ${country.name} (${country.id})`);
        await syncCountryDetail(country, tableMap);
        await syncIssuersForCountry(country.id);
        await syncLaws(country.id);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅  Countries sync done in ${elapsed}s`);
}

// ── Standalone entry ─────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('sync-countries.js')) {
    assertApiKey();
    const startTime = Date.now();
    mongoose.connect(DB_URL)
        .then(() => { console.log('✓  MongoDB connected\n'); return run(); })
        .then(() => printStats(startTime))
        .then(() => mongoose.disconnect())
        .catch((err) => { console.error('❌  Fatal:', err); process.exit(1); });
}

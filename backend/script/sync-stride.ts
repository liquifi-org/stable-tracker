/**
 * Stride Sync Script
 *
 * Fetches all available data from the Stride Stablecoin Regulation Tracker API
 * and upserts it into MongoDB. Designed to run periodically (e.g. monthly via cron).
 *
 * Required env vars:
 *   STRIDE_API_KEY  – bearer token (stride_live_...)
 *   DB_URL          – MongoDB connection string
 *
 * Usage:
 *   npm run stride:sync
 */

import mongoose from 'mongoose';
import { CountryModel } from '../src/infrastructure/database/mongoose/models/CountryModel';
import { IssuerModel } from '../src/infrastructure/database/mongoose/models/IssuerModel';
import { StablecoinModel } from '../src/infrastructure/database/mongoose/models/StablecoinModel';
import { LicenseModel } from '../src/infrastructure/database/mongoose/models/LicenseModel';
import { LawModel } from '../src/infrastructure/database/mongoose/models/LawModel';
import { WorldRegion } from '../src/domain/value-objects/WorldRegion';

// ── Stride API response types ────────────────────────────────────────────────

interface StrideCountryListItem {
    id: number;
    name: string;
}

interface StrideCountryTableItem {
    id: number;
    name: string;
    stage: number;
    fiat_backed: number;
    fiat_alert: string | null;
    crypto_backed: number;
    crypto_alert: string | null;
    commodity_backed: number;
    commodity_alert: string | null;
    algorithm_backed: number;
    algorithm_alert: string | null;
    is_stablecoin_specific: number;
}

interface StrideCountryTableResponse {
    data: StrideCountryTableItem[];
}

interface StrideCountryDetail {
    id: number;
    name: string;
    stage: number;
    regulator_name: string | null;
    regulator_description: string | null;
    description: string | null;
    currency: string | null;
    fiat_backed?: number;
    fiat_alert?: string | null;
    crypto_backed?: number;
    crypto_alert?: string | null;
    commodity_backed?: number;
    commodity_alert?: string | null;
    algorithm_backed?: number;
    algorithm_alert?: string | null;
    is_stablecoin_specific?: number;
}

interface StrideIssuer {
    id: number;
    name: string;
    official_name: string | null;
}

interface StrideLaw {
    id: number;
    country_id: number;
    title: string;
    enacted_date: string | null;
    description: string | null;
    citation: string | null;
}

interface StrideLicense {
    id: number;
    issuer_id: number;
    country_id: number;
    country_name: string;
    subsidiary_id: number | null;
    subsidiary_name: string | null;
    title: string;
    detail: string | null;
    url: string | null;
    can_issue: number;
}

interface StrideBlockchain {
    id: number;
    name: string;
    is_verified: number;
    priority: number;
    contract_address: string;
    date: string;
}

interface StrideStablecoin {
    stablecoin_id: number;
    stablecoin_name: string;
    stablecoin_symbol: string;
    inception_date: string | null;
    whitepaper: string | null;
    reference_currency: string;
    collateral_method: string | null;
    add_info: string | null;
    ucid: string | null;
    ucid_link: string | null;
    blockchains: StrideBlockchain[];
}

// ── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = 'https://tracker.stride.sc/api/v1';
const API_KEY = process.env.STRIDE_API_KEY;
const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017/sc-tracker';
/** Polite delay between HTTP requests (ms) */
const REQUEST_DELAY_MS = 350;
/** Stop syncing when fewer than this many calls remain in the daily window */
const RATE_LIMIT_FLOOR = 20;

if (!API_KEY) {
    console.error('❌  STRIDE_API_KEY environment variable is required.');
    process.exit(1);
}

// ── Rate-aware fetch ─────────────────────────────────────────────────────────

let rateLimitRemaining = 1000;
let totalCalls = 0;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Convert Stride's numeric country id to our zero-padded 3-char string */
function padCountryId(id: number): string {
    return String(id).padStart(3, '0');
}

async function strideFetch<T>(path: string): Promise<T | null> {
    if (rateLimitRemaining <= RATE_LIMIT_FLOOR) {
        console.warn(
            `⚠️  Rate limit nearly exhausted (${rateLimitRemaining} remaining). Skipping ${path}.`,
        );
        return null;
    }

    await sleep(REQUEST_DELAY_MS);
    totalCalls++;

    const url = `${BASE_URL}${path}`;
    let response: Response;

    try {
        response = await fetch(url, {
            headers: { Authorization: `Bearer ${API_KEY}` },
        });
    } catch (err) {
        console.error(`  ✗ Network error for ${path}:`, err);
        return null;
    }

    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining !== null) {
        rateLimitRemaining = parseInt(remaining, 10);
    }

    if (response.status === 429) {
        const resetAt = response.headers.get('X-RateLimit-Reset') ?? 'unknown';
        console.warn(`⚠️  Rate limit exceeded. Resets at: ${resetAt}`);
        return null;
    }

    if (response.status === 404) {
        return null; // expected for countries with no data
    }

    if (!response.ok) {
        console.error(`  ✗ HTTP ${response.status} for ${path}`);
        return null;
    }

    return response.json() as Promise<T>;
}

// ── Country sync ─────────────────────────────────────────────────────────────

async function syncCountry(
    listItem: StrideCountryListItem,
    tableMap: Map<number, StrideCountryTableItem>,
): Promise<void> {
    const countryId = padCountryId(listItem.id);
    const table = tableMap.get(listItem.id);

    const detail = await strideFetch<StrideCountryDetail>(`/countries/${listItem.id}`);
    if (detail === null) return;

    const isStablecoinSpecific =
        table?.is_stablecoin_specific === 1 || detail.is_stablecoin_specific === 1;

    // Per Stride docs: if not stablecoin-specific, treat stage as 0
    const stage = isStablecoinSpecific ? (detail.stage ?? 0) : 0;

    const now = new Date();
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
                syncedAt: now,
            },
            // Region only set when creating a document not in our seed
            $setOnInsert: { region: WorldRegion.OTHER },
        },
        { upsert: true },
    );
    console.log(`    ✓ Country ${countryId} (${detail.name})`);
}

// ── Laws sync ────────────────────────────────────────────────────────────────

async function syncLaws(countryId: number): Promise<void> {
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
    console.log(`      ✓ ${laws.length} law(s) for country ${countryId}`);
}

// ── Issuer sync ──────────────────────────────────────────────────────────────

async function upsertIssuers(issuers: StrideIssuer[]): Promise<void> {
    if (issuers.length === 0) return;

    const now = new Date();
    const ops = issuers.map((issuer) => ({
        updateOne: {
            filter: { issuerId: String(issuer.id) },
            update: {
                $set: {
                    name:         issuer.name,
                    officialName: issuer.official_name ?? undefined,
                    syncedAt:     now,
                },
                // originCountry only written on first insert (Stride doesn't tell us HQ)
                $setOnInsert: { originCountry: '' },
            },
            upsert: true,
        },
    }));

    await IssuerModel.bulkWrite(ops, { ordered: false });
}

// ── Stablecoin sync ──────────────────────────────────────────────────────────

async function syncStablecoins(issuerId: number, issuerName: string): Promise<void> {
    const coins = await strideFetch<StrideStablecoin[]>(`/stablecoins/issuer/${issuerId}`);
    if (!coins || coins.length === 0) return;

    const now = new Date();
    const ops = coins.map((coin) => ({
        updateOne: {
            filter: { stablecoinId: String(coin.stablecoin_id) },
            update: {
                $set: {
                    name:              coin.stablecoin_name,
                    issuerId:          String(issuerId),
                    referenceAsset:    coin.reference_currency,
                    symbol:            coin.stablecoin_symbol,
                    inceptionDate:     coin.inception_date   ?? undefined,
                    whitepaper:        coin.whitepaper        ?? undefined,
                    referenceCurrency: coin.reference_currency,
                    collateralMethod:  coin.collateral_method ?? undefined,
                    addInfo:           coin.add_info          ?? undefined,
                    ucid:              coin.ucid              ?? undefined,
                    ucidLink:          coin.ucid_link         ?? undefined,
                    blockchains: coin.blockchains.map((b) => ({
                        blockchainId:    b.id,
                        name:            b.name,
                        isVerified:      b.is_verified,
                        priority:        b.priority,
                        contractAddress: b.contract_address,
                        date:            b.date,
                    })),
                    syncedAt: now,
                },
            },
            upsert: true,
        },
    }));

    await StablecoinModel.bulkWrite(ops, { ordered: false });
    console.log(`      ✓ ${coins.length} stablecoin(s) for ${issuerName}`);
}

// ── License sync ─────────────────────────────────────────────────────────────

async function syncLicenses(issuerId: number, issuerName: string): Promise<void> {
    const licenses = await strideFetch<StrideLicense[]>(`/licenses/issuer/${issuerId}`);
    if (!licenses || licenses.length === 0) return;

    const now = new Date();
    const ops = licenses.map((lic) => ({
        updateOne: {
            filter: { licenseId: String(lic.id) },
            update: {
                $set: {
                    name:          lic.title,
                    type:          lic.title,
                    countryId:     padCountryId(lic.country_id),
                    issuerId:      String(lic.issuer_id),
                    subsidiaryId:  lic.subsidiary_id   ?? undefined,
                    subsidiaryName:lic.subsidiary_name ?? undefined,
                    countryName:   lic.country_name,
                    detail:        lic.detail          ?? undefined,
                    url:           lic.url             ?? undefined,
                    canIssue:      lic.can_issue,
                    syncedAt:      now,
                },
            },
            upsert: true,
        },
    }));

    await LicenseModel.bulkWrite(ops, { ordered: false });
    console.log(`      ✓ ${licenses.length} license(s) for ${issuerName}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const startTime = Date.now();
    console.log('🔄  Stride sync starting…');
    console.log(`    DB: ${DB_URL}`);
    console.log(`    API key: ${API_KEY!.slice(0, 18)}…\n`);

    await mongoose.connect(DB_URL);
    console.log('✓  MongoDB connected\n');

    // ── Step 1: country list + table (2 calls) ──────────────────────────────
    console.log('📋  Fetching country list and collateral table…');
    const countryList = await strideFetch<StrideCountryListItem[]>('/countries/list');
    const tableResponse = await strideFetch<StrideCountryTableResponse>('/countries/table');

    if (!countryList) {
        console.error('❌  Failed to fetch country list. Aborting.');
        await mongoose.disconnect();
        process.exit(1);
    }

    const tableMap = new Map<number, StrideCountryTableItem>();
    for (const item of tableResponse?.data ?? []) {
        tableMap.set(item.id, item);
    }
    console.log(
        `    ${countryList.length} countries from list, ${tableMap.size} with collateral data\n`,
    );

    // ── Step 2: per-country detail + issuers + laws ─────────────────────────
    console.log(`🌍  Syncing ${countryList.length} countries…`);
    const issuerMap = new Map<number, StrideIssuer>();

    for (const country of countryList) {
        if (rateLimitRemaining <= RATE_LIMIT_FLOOR) {
            console.warn('⚠️  Rate limit nearly exhausted — stopping country loop early.');
            break;
        }

        console.log(`  → ${country.name} (${country.id})`);

        // Country detail
        await syncCountry(country, tableMap);

        // Issuers (collect unique; upsert later in batch)
        const issuers = await strideFetch<StrideIssuer[]>(`/issuers/country/${country.id}`);
        if (issuers && issuers.length > 0) {
            let newCount = 0;
            for (const issuer of issuers) {
                if (!issuerMap.has(issuer.id)) {
                    issuerMap.set(issuer.id, issuer);
                    newCount++;
                }
            }
            if (newCount > 0)
                console.log(`      ✓ ${issuers.length} issuer(s) (${newCount} new)`);

            // Write regulated issuer IDs back to the country document
            await CountryModel.updateOne(
                { countryId: padCountryId(country.id) },
                { $set: { regulatedIssuerIds: issuers.map((i) => String(i.id)) } },
            );
        }

        // Laws / legislation
        await syncLaws(country.id);
    }

    // ── Step 3: upsert all unique issuers ───────────────────────────────────
    console.log(`\n🏢  Upserting ${issuerMap.size} unique issuer(s)…`);
    await upsertIssuers(Array.from(issuerMap.values()));
    console.log('    done\n');

    // ── Step 4: per-issuer stablecoins + licenses ───────────────────────────
    console.log(`💎  Syncing stablecoins and licenses for ${issuerMap.size} issuer(s)…`);
    for (const [issuerId, issuer] of issuerMap) {
        if (rateLimitRemaining <= RATE_LIMIT_FLOOR) {
            console.warn('⚠️  Rate limit nearly exhausted — stopping issuer loop early.');
            break;
        }
        console.log(`  → ${issuer.name} (${issuerId})`);
        await syncStablecoins(issuerId, issuer.name);
        await syncLicenses(issuerId, issuer.name);
    }

    // ── Done ────────────────────────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n──────────────────────────────────────────────');
    console.log(`✅  Stride sync complete in ${elapsed}s`);
    console.log(`    Total API calls:        ${totalCalls}`);
    console.log(`    Rate limit remaining:   ${rateLimitRemaining}`);
    console.log('──────────────────────────────────────────────\n');

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error('❌  Fatal error:', err);
    process.exit(1);
});

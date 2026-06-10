/**
 * Shared Stride API client — types, config and fetch utilities.
 * Imported by every sub-script; module-level state (rate-limit counters) is
 * shared across all importers within the same process run.
 */

// ── Stride API response types ────────────────────────────────────────────────

export interface StrideCountryListItem {
    id: number;
    name: string;
}

export interface StrideCountryTableItem {
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

export interface StrideCountryTableResponse {
    data: StrideCountryTableItem[];
}

export interface StrideCountryDetail {
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

export interface StrideIssuer {
    id: number;
    name: string;
    official_name: string | null;
}

export interface StrideLaw {
    id: number;
    country_id: number;
    title: string;
    enacted_date: string | null;
    description: string | null;
    citation: string | null;
}

export interface StrideLicense {
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

export interface StrideBlockchain {
    id: number;
    name: string;
    is_verified: number;
    priority: number;
    contract_address: string;
    date: string;
}

export interface StrideStablecoin {
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

export const BASE_URL = 'https://tracker.stride.sc/api/v1';
export const API_KEY = process.env.STRIDE_API_KEY;
export const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017/sc-tracker';
/** Polite delay between HTTP requests (ms) */
export const REQUEST_DELAY_MS = 350;
/** Stop syncing when fewer than this many calls remain in the daily window */
export const RATE_LIMIT_FLOOR = 20;

export function assertApiKey(): void {
    if (!API_KEY) {
        console.error('❌  STRIDE_API_KEY environment variable is required.');
        process.exit(1);
    }
}

// ── Rate-aware fetch ─────────────────────────────────────────────────────────

export let rateLimitRemaining = 1000;
export let totalCalls = 0;

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Convert Stride's numeric country id to our zero-padded 3-char string */
export function padCountryId(id: number): string {
    return String(id).padStart(3, '0');
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export async function strideFetch<T>(path: string): Promise<T | null> {
    if (rateLimitRemaining <= RATE_LIMIT_FLOOR) {
        console.warn(
            `⚠️  Rate limit nearly exhausted (${rateLimitRemaining} remaining). Skipping ${path}.`,
        );
        return null;
    }

    await sleep(REQUEST_DELAY_MS);
    totalCalls++;

    const url = `${BASE_URL}${path}`;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            response = await fetch(url, {
                headers: { Authorization: `Bearer ${API_KEY}` },
            });
            break;
        } catch (err) {
            if (attempt < MAX_RETRIES) {
                console.warn(`  ↩ Network error for ${path} (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS / 1000}s…`);
                await sleep(RETRY_DELAY_MS);
            } else {
                console.error(`  ✗ Network error for ${path} after ${MAX_RETRIES} attempts:`, err);
                return null;
            }
        }
    }

    if (response === null) return null;

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
        return null;
    }

    if (!response.ok) {
        console.error(`  ✗ HTTP ${response.status} for ${path}`);
        return null;
    }

    return response.json() as Promise<T>;
}

export function printStats(startTime: number): void {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n──────────────────────────────────────────────');
    console.log(`✅  Done in ${elapsed}s`);
    console.log(`    Total API calls:        ${totalCalls}`);
    console.log(`    Rate limit remaining:   ${rateLimitRemaining}`);
    console.log('──────────────────────────────────────────────\n');
}

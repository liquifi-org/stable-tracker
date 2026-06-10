/**
 * Stride sub-script: sync stablecoins
 *
 * Reads all issuers from MongoDB and fetches their stablecoins from Stride.
 * Requires issuers to already exist in the DB (run sync-issuers first).
 *
 * Usage:
 *   npm run stride:sync:stablecoins
 *   npm run stride:sync:stablecoins:local
 */

import mongoose from 'mongoose';
import { IssuerModel } from '../../src/infrastructure/database/mongoose/models/IssuerModel';
import { StablecoinModel } from '../../src/infrastructure/database/mongoose/models/StablecoinModel';
import {
    assertApiKey, DB_URL, RATE_LIMIT_FLOOR,
    strideFetch, rateLimitRemaining, printStats,
    StrideStablecoin,
} from './_client';

async function syncStablecoinsForIssuer(issuerId: string, issuerName: string): Promise<void> {
    const coins = await strideFetch<StrideStablecoin[]>(`/stablecoins/issuer/${issuerId}`);
    if (!coins || coins.length === 0) return;

    const now = new Date();
    const ops = coins.map((coin) => ({
        updateOne: {
            filter: { stablecoinId: String(coin.stablecoin_id) },
            update: {
                $set: {
                    name:              coin.stablecoin_name,
                    issuerId,
                    referenceAsset:    coin.reference_currency,
                    symbol:            coin.stablecoin_symbol,
                    inceptionDate:     coin.inception_date    ?? undefined,
                    whitepaper:        coin.whitepaper         ?? undefined,
                    referenceCurrency: coin.reference_currency,
                    collateralMethod:  coin.collateral_method  ?? undefined,
                    addInfo:           coin.add_info           ?? undefined,
                    ucid:              coin.ucid               ?? undefined,
                    ucidLink:          coin.ucid_link          ?? undefined,
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
    console.log(`  ✓ ${coins.length} stablecoin(s) for ${issuerName}`);
}

export async function run(): Promise<void> {
    const startTime = Date.now();

    const issuers = await IssuerModel.find().select('issuerId name').lean();
    if (issuers.length === 0) {
        console.log('    No issuers in DB. Run stride:sync:issuers first.');
        return;
    }
    console.log(`💎  Syncing stablecoins for ${issuers.length} issuer(s)…`);

    for (const issuer of issuers) {
        if (rateLimitRemaining <= RATE_LIMIT_FLOOR) {
            console.warn('⚠️  Rate limit nearly exhausted — stopping early.');
            break;
        }
        await syncStablecoinsForIssuer(issuer.issuerId, issuer.name);
    }

    console.log(`\n✅  Stablecoins sync done in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

// ── Standalone entry ─────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('sync-stablecoins.js')) {
    assertApiKey();
    const startTime = Date.now();
    mongoose.connect(DB_URL)
        .then(() => { console.log('✓  MongoDB connected\n'); return run(); })
        .then(() => printStats(startTime))
        .then(() => mongoose.disconnect())
        .catch((err) => { console.error('❌  Fatal:', err); process.exit(1); });
}

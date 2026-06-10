/**
 * Stride sub-script: sync licenses
 *
 * Reads all issuers from MongoDB and fetches their licenses from Stride.
 * Requires issuers to already exist in the DB (run sync-issuers first).
 *
 * Usage:
 *   npm run stride:sync:licenses
 *   npm run stride:sync:licenses:local
 */

import mongoose from 'mongoose';
import { IssuerModel } from '../../src/infrastructure/database/mongoose/models/IssuerModel';
import { LicenseModel } from '../../src/infrastructure/database/mongoose/models/LicenseModel';
import {
    assertApiKey, DB_URL, RATE_LIMIT_FLOOR,
    strideFetch, padCountryId, rateLimitRemaining, printStats,
    StrideLicense,
} from './_client';

async function syncLicensesForIssuer(issuerId: string, issuerName: string): Promise<void> {
    const licenses = await strideFetch<StrideLicense[]>(`/licenses/issuer/${issuerId}`);
    if (!licenses || licenses.length === 0) return;

    const now = new Date();
    const ops = licenses.map((lic) => ({
        updateOne: {
            filter: { licenseId: String(lic.id) },
            update: {
                $set: {
                    name:           lic.title,
                    type:           lic.title,
                    countryId:      padCountryId(lic.country_id),
                    issuerId,
                    subsidiaryId:   lic.subsidiary_id   ?? undefined,
                    subsidiaryName: lic.subsidiary_name ?? undefined,
                    countryName:    lic.country_name,
                    detail:         lic.detail          ?? undefined,
                    url:            lic.url             ?? undefined,
                    canIssue:       lic.can_issue,
                    syncedAt:       now,
                },
            },
            upsert: true,
        },
    }));

    await LicenseModel.bulkWrite(ops, { ordered: false });
    console.log(`  ✓ ${licenses.length} license(s) for ${issuerName}`);
}

export async function run(): Promise<void> {
    const startTime = Date.now();

    const issuers = await IssuerModel.find().select('issuerId name').lean();
    if (issuers.length === 0) {
        console.log('    No issuers in DB. Run stride:sync:issuers first.');
        return;
    }
    console.log(`📜  Syncing licenses for ${issuers.length} issuer(s)…`);

    for (const issuer of issuers) {
        if (rateLimitRemaining <= RATE_LIMIT_FLOOR) {
            console.warn('⚠️  Rate limit nearly exhausted — stopping early.');
            break;
        }
        await syncLicensesForIssuer(issuer.issuerId, issuer.name);
    }

    console.log(`\n✅  Licenses sync done in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

// ── Standalone entry ─────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('sync-licenses.js')) {
    assertApiKey();
    const startTime = Date.now();
    mongoose.connect(DB_URL)
        .then(() => { console.log('✓  MongoDB connected\n'); return run(); })
        .then(() => printStats(startTime))
        .then(() => mongoose.disconnect())
        .catch((err) => { console.error('❌  Fatal:', err); process.exit(1); });
}

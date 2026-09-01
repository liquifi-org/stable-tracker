import mongoose from 'mongoose';
import { CountryModel } from '../../src/infrastructure/database/mongoose/models/CountryModel';
import { WorldRegion } from '../../src/domain/value-objects/WorldRegion';
import { DB_URL } from './_client';

async function seed(): Promise<void> {
    try {
        if (DB_URL) {
            await mongoose.connect(DB_URL);
            console.log('✓ MongoDB connected');
        } else {
            console.warn('No DB_URL configured — attempting local connection fallback');
        }
    } catch (err) {
        console.warn('Could not connect to MongoDB, continuing:', err);
    }

    try {
        const countryId = '999';
        const now = new Date();
        const existing = await CountryModel.findOne({ countryId });

        if (!existing) {
            await CountryModel.create({
                countryId,
                name: 'European Union',
                stage: 0,
                region: WorldRegion.OTHER,
                regulatedIssuerIds: [],
                regulatedReserveTypes: [],
                isStablecoinSpecific: false,
                syncedAt: now,
            });
            console.log(`✅ Created country ${countryId}`);
        } else {
            console.log(`ℹ️ Country ${countryId} already exists`);
        }
    } catch (err) {
        console.error('❌ Seed failed:', err);
    } finally {
        try { await mongoose.disconnect(); } catch { /* ignore */ }
    }
}

if (require.main === module) {
    seed().catch((err) => { console.error(err); process.exit(1); });
}

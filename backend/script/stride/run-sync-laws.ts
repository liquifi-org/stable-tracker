import mongoose from 'mongoose';
import { syncLaws } from './sync-countries';
import { DB_URL } from './_client';

async function main(): Promise<void> {
    try {
        if (DB_URL) {
            await mongoose.connect(DB_URL);
            console.log('✓ MongoDB connected');
        } else {
            console.log('No DB_URL configured — attempting call without DB connection');
        }
    } catch (err) {
        console.warn('Could not connect to MongoDB, continuing:', err);
    }

    try {
        await syncLaws(999);
        console.log('✅ syncLaws(999) invocation finished');
    } catch (err) {
        console.error('❌ Error calling syncLaws:', err);
    } finally {
        try { await mongoose.disconnect(); } catch { /* ignore */ }
    }
}

if (require.main === module) {
    main().catch((err) => { console.error(err); process.exit(1); });
}

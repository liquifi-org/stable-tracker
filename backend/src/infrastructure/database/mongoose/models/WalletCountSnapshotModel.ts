import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletCountSnapshotDoc extends Document {
    countryId: string;
    period: string;
    walletCount: number;
    totalWallets?: number;
    pctHoldingStablecoins?: number;
    snapshotDate: Date;
    source: string;
    syncedAt: Date;
}

const WalletCountSnapshotSchema = new Schema<IWalletCountSnapshotDoc>(
    {
        countryId: { type: String, required: true, index: true },
        period: { type: String, required: true, index: true },
        walletCount: { type: Number, required: true },
        totalWallets: { type: Number },
        pctHoldingStablecoins: { type: Number },
        snapshotDate: { type: Date, required: true },
        source: { type: String, required: true, default: 'allium' },
        syncedAt: { type: Date, required: true },
    },
    { timestamps: true },
);

WalletCountSnapshotSchema.index({ countryId: 1, period: 1 }, { unique: true });

export const WalletCountSnapshotModel = mongoose.model<IWalletCountSnapshotDoc>(
    'WalletCountSnapshot',
    WalletCountSnapshotSchema,
);



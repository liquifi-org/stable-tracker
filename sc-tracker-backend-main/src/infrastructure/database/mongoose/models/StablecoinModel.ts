import mongoose, { Schema, Document } from 'mongoose';

export interface IStablecoinDoc extends Document {
    stablecoinId: string;
    name: string;
    issuerId: string;
    referenceAsset: string;
    symbol?: string;
    inceptionDate?: string;
    whitepaper?: string;
    referenceCurrency?: string;
    collateralMethod?: string;
    addInfo?: string;
    ucid?: string;
    ucidLink?: string;
    blockchains?: Array<{
        blockchainId: number;
        name: string;
        isVerified: number;
        priority: number;
        contractAddress: string;
        date: string;
    }>;
    syncedAt?: Date;
}

const StablecoinSchema = new Schema<IStablecoinDoc>(
    {
        stablecoinId: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        issuerId: { type: String, required: true, index: true },
        referenceAsset: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

StablecoinSchema.index({ name: 'text' });

export const StablecoinModel = mongoose.model<IStablecoinDoc>('Stablecoin', StablecoinSchema);

import mongoose, { Schema, Document } from 'mongoose';
import type { ReserveTypeCodeValue } from '../../../../domain/value-objects/ReserveTypeCode';

export interface IReferenceAssetDoc extends Document {
    referenceAsset: string;
    reserveType: ReserveTypeCodeValue;
}

const ReferenceAssetSchema = new Schema<IReferenceAssetDoc>(
    {
        referenceAsset: { type: String, required: true, unique: true, index: true },
        reserveType: {
            type: String,
            required: true,
            enum: ['fiat', 'commodity', 'crypto', 'algorithmic', 'other'],
        },
    },
    { timestamps: true },
);

export const ReferenceAssetModel = mongoose.model<IReferenceAssetDoc>(
    'ReferenceAsset',
    ReferenceAssetSchema,
);

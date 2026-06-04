import mongoose, { Schema, Document } from 'mongoose';
import type { ReserveTypeCodeValue } from '../../../../domain/value-objects/ReserveTypeCode';

export interface IReserveTypeDoc extends Document {
    reserveType: ReserveTypeCodeValue;
    description?: string;
}

const ReserveTypeSchema = new Schema<IReserveTypeDoc>(
    {
        reserveType: {
            type: String,
            required: true,
            unique: true,
            enum: ['fiat', 'commodity', 'crypto', 'algorithmic', 'other'],
        },
        description: { type: String },
    },
    { timestamps: true },
);

export const ReserveTypeModel = mongoose.model<IReserveTypeDoc>('ReserveType', ReserveTypeSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IExchangeRateDoc extends Document {
    referenceAsset: string;
    currencyOriginal: string;
    usdExchangeRate: number;
    date: Date;
}

const ExchangeRateSchema = new Schema<IExchangeRateDoc>(
    {
        referenceAsset: { type: String, required: true, index: true },
        currencyOriginal: { type: String, required: true, index: true },
        usdExchangeRate: { type: Number, required: true },
        date: { type: Date, required: true, index: true },
    },
    { timestamps: true },
);

ExchangeRateSchema.index({ referenceAsset: 1, currencyOriginal: 1, date: -1 });

export const ExchangeRateModel = mongoose.model<IExchangeRateDoc>(
    'ExchangeRate',
    ExchangeRateSchema,
);

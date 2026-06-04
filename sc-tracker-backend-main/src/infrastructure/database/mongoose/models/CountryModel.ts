import mongoose, { Schema, Document } from 'mongoose';
import { WORLD_REGION_VALUES } from '../../../../domain/value-objects/WorldRegion';

export interface ICountryDoc extends Document {
    countryId: string;  // ISO 3166-1 numeric, e.g. "840" for United States
    name: string;
    region: string;
    population?: number;
    regulatedIssuerIds: string[];
    regulatedReserveTypes: string[];
    // Stride API fields
    stage?: number;                  // 0=none/banned 1=draft 2=proposed 3=live
    regulatorName?: string;
    regulatorDescription?: string;
    description?: string;
    currency?: string;
    fiatBacked?: number;             // 0=prohibited 1=allowed 2=unspecified
    fiatAlert?: string;
    cryptoBacked?: number;
    cryptoAlert?: string;
    commodityBacked?: number;
    commodityAlert?: string;
    algorithmBacked?: number;
    algorithmAlert?: string;
    isStablecoinSpecific?: boolean;
    syncedAt?: Date;
}

const CountrySchema = new Schema<ICountryDoc>(
    {
        countryId: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        region: { type: String, required: true, enum: WORLD_REGION_VALUES, index: true },
        population: { type: Number },
        regulatedIssuerIds:    { type: [String], default: [] },
        regulatedReserveTypes: { type: [String], default: [] },
        // Stride API fields
        stage:                 { type: Number },
        regulatorName:         { type: String },
        regulatorDescription:  { type: String },
        description:           { type: String },
        currency:              { type: String },
        fiatBacked:            { type: Number },
        fiatAlert:             { type: String },
        cryptoBacked:          { type: Number },
        cryptoAlert:           { type: String },
        commodityBacked:       { type: Number },
        commodityAlert:        { type: String },
        algorithmBacked:       { type: Number },
        algorithmAlert:        { type: String },
        isStablecoinSpecific:  { type: Boolean },
        syncedAt:              { type: Date },
    },
    { timestamps: true },
);

CountrySchema.index({ name: 'text' });

export const CountryModel = mongoose.model<ICountryDoc>('Country', CountrySchema);

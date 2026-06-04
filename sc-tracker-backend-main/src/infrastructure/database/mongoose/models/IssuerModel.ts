import mongoose, { Schema, Document } from 'mongoose';

export interface IIssuerDoc extends Document {
    issuerId: string;
    name: string;
    originCountry: string;
    officialName?: string;
    syncedAt?: Date;
}

const IssuerSchema = new Schema<IIssuerDoc>(
    {
        issuerId:      { type: String, required: true, unique: true, index: true },
        name:          { type: String, required: true },
        originCountry: { type: String, default: '', index: true },
        officialName:  { type: String },
        syncedAt:      { type: Date },
    },
    { timestamps: true },
);

IssuerSchema.index({ name: 'text' });

export const IssuerModel = mongoose.model<IIssuerDoc>('Issuer', IssuerSchema);

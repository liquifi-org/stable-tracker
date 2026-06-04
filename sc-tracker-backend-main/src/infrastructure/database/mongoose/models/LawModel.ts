import mongoose, { Schema, Document } from 'mongoose';

export interface ILawDoc extends Document {
    lawId: string;      // String(Stride id)
    countryId: string;  // ISO 3166-1 numeric string
    title: string;
    enactedDate?: string;
    description?: string;
    citation?: string;
    syncedAt?: Date;
}

const LawSchema = new Schema<ILawDoc>(
    {
        lawId:       { type: String, required: true, unique: true, index: true },
        countryId:   { type: String, required: true, index: true },
        title:       { type: String, required: true },
        enactedDate: { type: String },
        description: { type: String },
        citation:    { type: String },
        syncedAt:    { type: Date },
    },
    { timestamps: true },
);

LawSchema.index({ title: 'text' });

export const LawModel = mongoose.model<ILawDoc>('Law', LawSchema);

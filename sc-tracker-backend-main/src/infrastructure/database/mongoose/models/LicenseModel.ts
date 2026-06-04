import mongoose, { Schema, Document } from 'mongoose';

export interface ILicenseDoc extends Document {
    licenseId: string;
    name: string;
    type: string;
    countryId: string;
    // Stride API issuer license fields
    issuerId?: string;
    subsidiaryId?: number;
    subsidiaryName?: string;
    countryName?: string;
    detail?: string;
    url?: string;
    canIssue?: number;
    syncedAt?: Date;
}

const LicenseSchema = new Schema<ILicenseDoc>(
    {
        licenseId:     { type: String, required: true, unique: true, index: true },
        name:          { type: String, required: true },
        type:          { type: String, required: true },
        countryId:     { type: String, required: true, index: true },
        issuerId:      { type: String, index: true },
        subsidiaryId:  { type: Number },
        subsidiaryName:{ type: String },
        countryName:   { type: String },
        detail:        { type: String },
        url:           { type: String },
        canIssue:      { type: Number },
        syncedAt:      { type: Date },
    },
    { timestamps: true },
);

export const LicenseModel = mongoose.model<ILicenseDoc>('License', LicenseSchema);

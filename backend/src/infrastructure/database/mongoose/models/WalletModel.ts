import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletDoc extends Document {
    walletId: string;
    countryId: string;
    dateOpened: Date;
    dateClosed?: Date | null;
}

const WalletSchema = new Schema<IWalletDoc>(
    {
        walletId: { type: String, required: true, unique: true, index: true },
        countryId: { type: String, required: true, index: true },
        dateOpened: { type: Date, required: true, index: true },
        dateClosed: { type: Date, default: null },
    },
    { timestamps: true },
);

WalletSchema.index({ countryId: 1, dateOpened: 1, dateClosed: 1 });

export const WalletModel = mongoose.model<IWalletDoc>('Wallet', WalletSchema);

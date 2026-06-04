import mongoose, { Schema, Document } from 'mongoose';
import type { TransactionTypeValue } from '../../../../domain/value-objects/TransactionType';

export interface ITransactionDoc extends Document {
    transactionId: string;
    senderCountryId: string;
    receiverCountryId: string;
    date: Date;
    type: TransactionTypeValue;
    stablecoinId: string;
    value: { amount: number; currency: string };
}

const TransactionSchema = new Schema<ITransactionDoc>(
    {
        transactionId: { type: String, required: true, unique: true, index: true },
        senderCountryId: { type: String, required: true, index: true },
        receiverCountryId: { type: String, required: true, index: true },
        date: { type: Date, required: true, index: true },
        type: {
            type: String,
            required: true,
            enum: ['p2p', 'b2b', 'b2c', 'remittance', 'exchange', 'other'],
        },
        stablecoinId: { type: String, required: true, index: true },
        value: {
            amount: { type: Number, required: true },
            currency: { type: String, required: true },
        },
    },
    { timestamps: true },
);

TransactionSchema.index({ senderCountryId: 1, receiverCountryId: 1, date: -1 });
TransactionSchema.index({ stablecoinId: 1, date: -1 });

export const TransactionModel = mongoose.model<ITransactionDoc>(
    'Transaction',
    TransactionSchema,
);

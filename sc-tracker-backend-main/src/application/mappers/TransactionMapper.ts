import type { Transaction } from '../../domain/entities/Transaction';
import type { TransactionDto } from '../dtos/TransactionDto';

export class TransactionMapper {
    static toDto(tx: Transaction): TransactionDto {
        return {
            transactionId: tx.transactionId,
            senderCountryId: tx.senderCountryId,
            receiverCountryId: tx.receiverCountryId,
            date: tx.date.toISOString().split('T')[0],
            type: tx.type,
            stablecoinId: tx.stablecoinId,
            value: {
                amount: tx.value.amount,
                currency: tx.value.currency,
            },
        };
    }
}

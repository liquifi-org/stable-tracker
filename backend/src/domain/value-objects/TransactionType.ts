export type TransactionTypeValue = 'p2p' | 'b2b' | 'b2c' | 'remittance' | 'exchange' | 'other' | 'corridor';

const VALID: ReadonlyArray<TransactionTypeValue> = [
    'p2p',
    'b2b',
    'b2c',
    'remittance',
    'exchange',
    'other',
    'corridor',
];

export class TransactionType {
    private constructor(readonly value: TransactionTypeValue) {}

    static create(value: string): TransactionType {
        if (!VALID.includes(value as TransactionTypeValue)) {
            throw new Error(`Invalid transaction type: "${value}"`);
        }
        return new TransactionType(value as TransactionTypeValue);
    }

    toString(): string {
        return this.value;
    }
}

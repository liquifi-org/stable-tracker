export class Money {
    private constructor(
        readonly amount: number,
        readonly currency: string,
    ) {}

    static create(amount: number, currency: string): Money {
        if (amount < 0) throw new Error('Amount cannot be negative');
        if (!currency || currency.trim().length === 0) throw new Error('Invalid currency code');
        return new Money(amount, currency.trim().toUpperCase());
    }

    toJSON(): { amount: number; currency: string } {
        return { amount: this.amount, currency: this.currency };
    }
}

import { describe, it, expect } from 'vitest';
import { CountryCode } from '../../../src/domain/value-objects/CountryCode';
import { Money } from '../../../src/domain/value-objects/Money';
import { ReserveTypeCode } from '../../../src/domain/value-objects/ReserveTypeCode';
import { TransactionType } from '../../../src/domain/value-objects/TransactionType';

describe('CountryCode', () => {
    it('creates a valid ISO 3166-1 alpha-2 code', () => {
        const code = CountryCode.create('AR');
        expect(code.value).toBe('AR');
    });

    it('throws for lowercase code', () => {
        expect(() => CountryCode.create('ar')).toThrow('Invalid country code');
    });

    it('throws for code longer than 2 chars', () => {
        expect(() => CountryCode.create('USA')).toThrow('Invalid country code');
    });

    it('compares equality correctly', () => {
        const a = CountryCode.create('US');
        const b = CountryCode.create('US');
        const c = CountryCode.create('GB');
        expect(a.equals(b)).toBe(true);
        expect(a.equals(c)).toBe(false);
    });
});

describe('Money', () => {
    it('creates valid money', () => {
        const m = Money.create(100, 'usd');
        expect(m.amount).toBe(100);
        expect(m.currency).toBe('USD'); // normalized to upper
    });

    it('throws for negative amount', () => {
        expect(() => Money.create(-1, 'USD')).toThrow('negative');
    });

    it('throws for empty currency', () => {
        expect(() => Money.create(10, '')).toThrow('Invalid currency code');
    });
});

describe('ReserveTypeCode', () => {
    it('accepts valid reserve types', () => {
        const valid = ['fiat', 'commodity', 'crypto', 'algorithmic', 'other'] as const;
        for (const v of valid) {
            expect(() => ReserveTypeCode.create(v)).not.toThrow();
        }
    });

    it('throws for unknown reserve type', () => {
        expect(() => ReserveTypeCode.create('equity')).toThrow('Invalid reserve type code');
    });
});

describe('TransactionType', () => {
    it('accepts all valid types', () => {
        const valid = ['p2p', 'b2b', 'b2c', 'remittance', 'exchange', 'other'] as const;
        for (const v of valid) {
            expect(() => TransactionType.create(v)).not.toThrow();
        }
    });

    it('throws for invalid type', () => {
        expect(() => TransactionType.create('cash')).toThrow('Invalid transaction type');
    });
});

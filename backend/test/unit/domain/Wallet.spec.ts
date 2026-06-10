import { describe, it, expect } from 'vitest';
import { Wallet } from '../../../src/domain/entities/Wallet';

describe('Wallet entity', () => {
    it('reports active status when dateClosed is null', () => {
        const wallet = new Wallet({
            walletId: 'w1',
            countryId: 'US',
            dateOpened: new Date('2023-01-01'),
            dateClosed: null,
        });
        expect(wallet.status).toBe('active');
    });

    it('reports closed status when dateClosed is in the past', () => {
        const wallet = new Wallet({
            walletId: 'w2',
            countryId: 'US',
            dateOpened: new Date('2022-01-01'),
            dateClosed: new Date('2023-01-01'),
        });
        expect(wallet.status).toBe('closed');
    });
});

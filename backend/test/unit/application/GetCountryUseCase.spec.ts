import { describe, it, expect, vi } from 'vitest';
import { GetCountryUseCase } from '../../../src/application/use-cases/countries/GetCountryUseCase';
import { Country } from '../../../src/domain/entities/Country';
import { NotFoundError } from '../../../src/domain/errors/NotFoundError';
import type { ICountryRepository } from '../../../src/domain/repositories/ICountryRepository';

const mockRepo: ICountryRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    findRegulatedIssuers: vi.fn(),
    findRegulatedReserveTypes: vi.fn(),
    findLicenses: vi.fn(),
};

describe('GetCountryUseCase', () => {
    it('returns a CountryDto when the country exists', async () => {
        const country = new Country({
            countryId: 'AR',
            name: 'Argentina',
            region: 'South America',
            regulatedIssuerIds: [],
            regulatedReserveTypes: [],
        });
        vi.mocked(mockRepo.findById).mockResolvedValue(country);

        const useCase = new GetCountryUseCase(mockRepo);
        const result = await useCase.execute('AR');

        expect(result.countryId).toBe('AR');
        expect(result.name).toBe('Argentina');
        expect(result.region).toBe('South America');
    });

    it('throws NotFoundError when country does not exist', async () => {
        vi.mocked(mockRepo.findById).mockResolvedValue(null);

        const useCase = new GetCountryUseCase(mockRepo);
        await expect(useCase.execute('ZZ')).rejects.toThrow(NotFoundError);
    });
});

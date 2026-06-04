import type { ICountryRepository } from '../../../domain/repositories/ICountryRepository';
import type { IssuerDto } from '../../dtos/IssuerDto';
import { IssuerMapper } from '../../mappers/IssuerMapper';
import { NotFoundError } from '../../../domain/errors/NotFoundError';

export class ListCountryRegulatedIssuersUseCase {
    constructor(private readonly countryRepo: ICountryRepository) {}

    async execute(countryId: string): Promise<IssuerDto[]> {
        const country = await this.countryRepo.findById(countryId);
        if (!country) throw new NotFoundError('Country', countryId);
        const issuers = await this.countryRepo.findRegulatedIssuers(countryId);
        return issuers.map(IssuerMapper.toDto);
    }
}

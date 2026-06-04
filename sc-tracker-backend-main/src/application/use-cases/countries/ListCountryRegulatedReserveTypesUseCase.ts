import type { ICountryRepository } from '../../../domain/repositories/ICountryRepository';
import type { ReserveTypeDto } from '../../dtos/ReserveTypeDto';
import { ReserveTypeMapper } from '../../mappers/ReserveTypeMapper';
import { NotFoundError } from '../../../domain/errors/NotFoundError';

export class ListCountryRegulatedReserveTypesUseCase {
    constructor(private readonly countryRepo: ICountryRepository) {}

    async execute(countryId: string): Promise<ReserveTypeDto[]> {
        const country = await this.countryRepo.findById(countryId);
        if (!country) throw new NotFoundError('Country', countryId);
        const reserveTypes = await this.countryRepo.findRegulatedReserveTypes(countryId);
        return reserveTypes.map(ReserveTypeMapper.toDto);
    }
}

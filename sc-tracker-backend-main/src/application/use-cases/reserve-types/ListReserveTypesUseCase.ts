import type { IReserveTypeRepository } from '../../../domain/repositories/IReserveTypeRepository';
import type { ReserveTypeDto } from '../../dtos/ReserveTypeDto';
import { ReserveTypeMapper } from '../../mappers/ReserveTypeMapper';

export class ListReserveTypesUseCase {
    constructor(private readonly reserveTypeRepo: IReserveTypeRepository) {}

    async execute(): Promise<ReserveTypeDto[]> {
        const items = await this.reserveTypeRepo.findAll();
        return items.map(ReserveTypeMapper.toDto);
    }
}

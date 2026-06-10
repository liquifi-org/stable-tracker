import type { ReserveType } from '../../domain/entities/ReserveType';
import type { ReserveTypeDto } from '../dtos/ReserveTypeDto';

export class ReserveTypeMapper {
    static toDto(rt: ReserveType): ReserveTypeDto {
        return {
            reserveType: rt.reserveType,
            description: rt.description,
        };
    }
}

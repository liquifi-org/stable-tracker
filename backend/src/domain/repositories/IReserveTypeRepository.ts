import type { ReserveType } from '../entities/ReserveType';

export interface IReserveTypeRepository {
    findAll(): Promise<ReserveType[]>;
    findByCodes(codes: string[]): Promise<ReserveType[]>;
}

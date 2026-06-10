import { ReserveTypeModel } from '../models/ReserveTypeModel';
import type { IReserveTypeRepository } from '../../../../domain/repositories/IReserveTypeRepository';
import { ReserveType } from '../../../../domain/entities/ReserveType';
import type { ReserveTypeCodeValue } from '../../../../domain/value-objects/ReserveTypeCode';

export class MongoReserveTypeRepository implements IReserveTypeRepository {
    async findAll(): Promise<ReserveType[]> {
        const docs = await ReserveTypeModel.find().lean();
        return docs.map(
            (d) =>
                new ReserveType({
                    reserveType: d.reserveType as ReserveTypeCodeValue,
                    description: d.description,
                }),
        );
    }

    async findByCodes(codes: string[]): Promise<ReserveType[]> {
        const docs = await ReserveTypeModel.find({ reserveType: { $in: codes } }).lean();
        return docs.map(
            (d) =>
                new ReserveType({
                    reserveType: d.reserveType as ReserveTypeCodeValue,
                    description: d.description,
                }),
        );
    }
}

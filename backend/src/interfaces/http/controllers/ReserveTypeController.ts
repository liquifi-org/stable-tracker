import { Request, Response, NextFunction } from 'express';
import type { ListReserveTypesUseCase } from '../../../application/use-cases/reserve-types/ListReserveTypesUseCase';

export class ReserveTypeController {
    constructor(private readonly listReserveTypes: ListReserveTypesUseCase) {}

    list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.listReserveTypes.execute();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

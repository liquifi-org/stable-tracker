import { Request, Response, NextFunction } from 'express';
import type { ListStablecoinsUseCase } from '../../../application/use-cases/stablecoins/ListStablecoinsUseCase';
import type { GetStablecoinUseCase } from '../../../application/use-cases/stablecoins/GetStablecoinUseCase';
import { ListStablecoinsSchema, StablecoinIdParamSchema } from '../validators/stablecoinValidators';

export class StablecoinController {
    constructor(
        private readonly listStablecoins: ListStablecoinsUseCase,
        private readonly getStablecoin: GetStablecoinUseCase,
    ) {}

    list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = ListStablecoinsSchema.parse(req.query);
            const result = await this.listStablecoins.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { stablecoinId } = StablecoinIdParamSchema.parse(req.params);
            const result = await this.getStablecoin.execute(stablecoinId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

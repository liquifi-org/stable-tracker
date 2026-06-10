import { Request, Response, NextFunction } from 'express';
import type { ListWalletsUseCase } from '../../../application/use-cases/wallets/ListWalletsUseCase';
import { ListWalletsSchema } from '../validators/walletValidators';

export class WalletController {
    constructor(private readonly listWallets: ListWalletsUseCase) {}

    list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = ListWalletsSchema.parse(req.query);
            const result = await this.listWallets.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

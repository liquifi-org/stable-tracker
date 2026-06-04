import { Request, Response, NextFunction } from 'express';
import type { ListTransactionsUseCase } from '../../../application/use-cases/transactions/ListTransactionsUseCase';
import { ListTransactionsSchema } from '../validators/transactionValidators';

export class TransactionController {
    constructor(private readonly listTransactions: ListTransactionsUseCase) {}

    list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = ListTransactionsSchema.parse(req.query);
            const result = await this.listTransactions.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

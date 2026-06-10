import { Request, Response, NextFunction } from 'express';
import type { ListExchangeRatesUseCase } from '../../../application/use-cases/exchange-rates/ListExchangeRatesUseCase';
import { ListExchangeRatesSchema } from '../validators/exchangeRateValidators';

export class ExchangeRateController {
    constructor(private readonly listExchangeRates: ListExchangeRatesUseCase) {}

    list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = ListExchangeRatesSchema.parse(req.query);
            const result = await this.listExchangeRates.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

import { Request, Response, NextFunction } from 'express';
import type { ListIssuersUseCase } from '../../../application/use-cases/issuers/ListIssuersUseCase';
import type { GetIssuerUseCase } from '../../../application/use-cases/issuers/GetIssuerUseCase';
import { ListIssuersSchema, IssuerIdParamSchema } from '../validators/issuerValidators';

export class IssuerController {
    constructor(
        private readonly listIssuers: ListIssuersUseCase,
        private readonly getIssuer: GetIssuerUseCase,
    ) {}

    list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = ListIssuersSchema.parse(req.query);
            const result = await this.listIssuers.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { issuerId } = IssuerIdParamSchema.parse(req.params);
            const result = await this.getIssuer.execute(issuerId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

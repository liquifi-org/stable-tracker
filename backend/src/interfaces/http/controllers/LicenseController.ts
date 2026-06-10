import { Request, Response, NextFunction } from 'express';
import type { ListLicensesUseCase } from '../../../application/use-cases/licenses/ListLicensesUseCase';
import { ListLicensesSchema } from '../validators/licenseValidators';

export class LicenseController {
    constructor(private readonly listLicenses: ListLicensesUseCase) {}

    list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = ListLicensesSchema.parse(req.query);
            const result = await this.listLicenses.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

import { Request, Response, NextFunction } from 'express';
import type { ListReferenceAssetsUseCase } from '../../../application/use-cases/reference-assets/ListReferenceAssetsUseCase';
import { z } from 'zod';

const QuerySchema = z.object({
    reserveType: z
        .enum(['fiat', 'commodity', 'crypto', 'algorithmic', 'other'])
        .optional(),
});

export class ReferenceAssetController {
    constructor(private readonly listReferenceAssets: ListReferenceAssetsUseCase) {}

    list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = QuerySchema.parse(req.query);
            const result = await this.listReferenceAssets.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

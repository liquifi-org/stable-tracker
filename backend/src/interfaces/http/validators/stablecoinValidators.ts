import { z } from 'zod';
import { PaginationSchema } from './sharedValidators';

export const ListStablecoinsSchema = PaginationSchema.extend({
    issuerId: z.string().optional(),
    referenceAsset: z.string().optional(),
    q: z.string().optional(),
});

export const StablecoinIdParamSchema = z.object({
    stablecoinId: z.string().min(1),
});

export type ListStablecoinsQuery = z.infer<typeof ListStablecoinsSchema>;
export type StablecoinIdParam = z.infer<typeof StablecoinIdParamSchema>;

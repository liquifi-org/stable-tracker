import { z } from 'zod';
import { PaginationSchema } from './sharedValidators';

export const ListIssuersSchema = PaginationSchema.extend({
    originCountry: z.string().regex(/^[A-Z]{2}$/).optional(),
    q: z.string().optional(),
});

export const IssuerIdParamSchema = z.object({
    issuerId: z.string().min(1),
});

export type ListIssuersQuery = z.infer<typeof ListIssuersSchema>;
export type IssuerIdParam = z.infer<typeof IssuerIdParamSchema>;

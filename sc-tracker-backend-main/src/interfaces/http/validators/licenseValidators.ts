import { z } from 'zod';
import { PaginationSchema } from './sharedValidators';

export const ListLicensesSchema = PaginationSchema.extend({
    countryId: z.string().regex(/^[A-Z]{2}$/).optional(),
    type: z.string().optional(),
});

export type ListLicensesQuery = z.infer<typeof ListLicensesSchema>;

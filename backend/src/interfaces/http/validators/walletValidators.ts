import { z } from 'zod';
import { PaginationSchema } from './sharedValidators';

export const ListWalletsSchema = PaginationSchema.extend({
    countryId: z.string().regex(/^[A-Z]{2}$/).optional(),
    openedFrom: z.string().date().optional(),
    openedTo: z.string().date().optional(),
    status: z.enum(['active', 'closed', 'any']).default('any'),
});

export type ListWalletsQuery = z.infer<typeof ListWalletsSchema>;

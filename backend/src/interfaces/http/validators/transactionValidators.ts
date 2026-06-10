import { z } from 'zod';
import { PaginationSchema, DateRangeSchema } from './sharedValidators';

export const ListTransactionsSchema = PaginationSchema.merge(DateRangeSchema).extend({
    senderCountryId: z.string().regex(/^[A-Z]{2}$/).optional(),
    receiverCountryId: z.string().regex(/^[A-Z]{2}$/).optional(),
    stablecoinId: z.string().optional(),
    type: z.enum(['p2p', 'b2b', 'b2c', 'remittance', 'exchange', 'other']).optional(),
});

export type ListTransactionsQuery = z.infer<typeof ListTransactionsSchema>;

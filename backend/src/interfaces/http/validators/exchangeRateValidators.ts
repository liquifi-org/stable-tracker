import { z } from 'zod';
import { PaginationSchema, DateRangeSchema } from './sharedValidators';

export const ListExchangeRatesSchema = PaginationSchema.merge(DateRangeSchema).extend({
    referenceAsset: z.string().optional(),
    currencyOriginal: z.string().optional(),
});

export type ListExchangeRatesQuery = z.infer<typeof ListExchangeRatesSchema>;

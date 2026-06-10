import { z } from 'zod';
import { PaginationSchema } from './sharedValidators';

export const ListCountriesSchema = PaginationSchema.extend({
    region: z.string().optional(),
    q: z.string().optional(),
    sort: z.string().optional(),
});

export const CountryIdParamSchema = z.object({
    countryId: z
        .string()
        .regex(/^\d{1,3}$/, 'countryId must be an ISO 3166-1 numeric country code'),
});

export type ListCountriesQuery = z.infer<typeof ListCountriesSchema>;
export type CountryIdParam = z.infer<typeof CountryIdParamSchema>;

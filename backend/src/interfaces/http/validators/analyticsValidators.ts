import { z } from 'zod';
import { YearMonthSchema } from './sharedValidators';

const StablecoinFilterSchema = z.string().optional();
const ReferenceAssetFilterSchema = z.string().optional();
const CountryIdValue = z
    .string()
    .regex(/^\d{1,3}$/, 'countryId must be an ISO 3166-1 numeric country code')
    .transform((v) => v.padStart(3, '0'));

export const AdoptionQuerySchema = YearMonthSchema.extend({
    referenceAsset: ReferenceAssetFilterSchema,
    stablecoinId: StablecoinFilterSchema,
    countryId: z.union([CountryIdValue, z.literal('All')]).optional(),
    region: z.string().optional(),
});

export const CorridorQuerySchema = YearMonthSchema.extend({
    referenceAsset: ReferenceAssetFilterSchema,
    stablecoinId: StablecoinFilterSchema,
    countryId: z.union([CountryIdValue, z.literal('All')]).optional(),
    regionFrom: z.string().optional(),
    regionTo: z.string().optional(),
    bidirectional: z
        .string()
        .optional()
        .transform((v) => v === 'true'),
});

export const CountryOverviewQuerySchema = YearMonthSchema.extend({
    referenceAsset: ReferenceAssetFilterSchema,
});

export const GlobalInsightsQuerySchema = YearMonthSchema;

export const CorridorStablecoinsQuerySchema = YearMonthSchema;

export const CountryIdPathSchema = z.object({
    countryId: CountryIdValue,
});

export const CountryCorridorsQuerySchema = YearMonthSchema.extend({
    referenceAsset: ReferenceAssetFilterSchema,
    direction: z.enum(['inflow', 'outflow', 'both']).default('both'),
    topStablecoins: z.coerce.number().int().min(0).max(10).default(3),
});

export type AdoptionQuery = z.infer<typeof AdoptionQuerySchema>;
export type CorridorQuery = z.infer<typeof CorridorQuerySchema>;
export type CountryOverviewQuery = z.infer<typeof CountryOverviewQuerySchema>;
export type CountryCorridorsQuery = z.infer<typeof CountryCorridorsQuerySchema>;
export type GlobalInsightsQuery = z.infer<typeof GlobalInsightsQuerySchema>;
export type CorridorStablecoinsQuery = z.infer<typeof CorridorStablecoinsQuerySchema>;

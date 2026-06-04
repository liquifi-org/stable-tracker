import { z } from 'zod';

export const PaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export const DateRangeSchema = z.object({
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
});

export const CountryCodeSchema = z
    .string()
    .regex(/^[A-Z]{2}$/, 'Must be ISO 3166-1 alpha-2')
    .optional();

export const YearMonthSchema = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12).optional(),
});

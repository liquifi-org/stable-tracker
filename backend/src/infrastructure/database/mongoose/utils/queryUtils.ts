/**
 * Parses a sort expression like "name,-region" into a Mongoose-compatible sort object.
 * Fields prefixed with "-" are sorted descending; all others ascending.
 */
export function parseSortParam(sort: string | undefined): Record<string, 1 | -1> {
    if (!sort) return {};
    return sort.split(',').reduce<Record<string, 1 | -1>>((acc, raw) => {
        const field = raw.trim();
        if (field.startsWith('-')) {
            acc[field.slice(1)] = -1;
        } else {
            acc[field] = 1;
        }
        return acc;
    }, {});
}

export function buildDateFilter(dateFrom?: string, dateTo?: string): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (dateFrom) filter['$gte'] = new Date(dateFrom);
    if (dateTo) filter['$lte'] = new Date(dateTo);
    return filter;
}

export function periodBoundaries(year: number, month?: number): { start: Date; end: Date } {
    if (month !== undefined) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        return { start, end };
    }
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    return { start, end };
}

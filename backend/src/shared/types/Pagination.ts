export interface PaginatedResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface PageQuery {
    page: number;
    pageSize: number;
}

export function buildPaginatedResult<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
): PaginatedResult<T> {
    return {
        items,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
    };
}

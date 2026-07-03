export type PaginationParams = {
    page?: number;
    perPage?: number;
};

export type PaginationMeta = {
    page: number;
    perPage: number;
    total: number;
};

export function normalizePagination({ page, perPage }: PaginationParams) {
    const normalizedPage = page && page > 0 ? Math.floor(page) : 1;
    const normalizedPerPage = perPage && perPage > 0 ? Math.floor(perPage) : 20;
    return {
        page: normalizedPage,
        perPage: normalizedPerPage,
        offset: (normalizedPage - 1) * normalizedPerPage,
    };
}

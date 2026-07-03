export function normalizePagination({ page, perPage }) {
    const normalizedPage = page && page > 0 ? Math.floor(page) : 1;
    const normalizedPerPage = perPage && perPage > 0 ? Math.floor(perPage) : 20;
    return {
        page: normalizedPage,
        perPage: normalizedPerPage,
        offset: (normalizedPage - 1) * normalizedPerPage,
    };
}

/**
 * Default pagination constants
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Pagination parameters with defaults applied
 */
export interface PaginationParams {
    page: number;
    pageSize: number;
}

/**
 * Extracts pagination parameters from query with defaults
 */
export const getPaginationParams = (query: {
    page?: number;
    pageSize?: number;
}): PaginationParams => ({
    page: query.page ?? DEFAULT_PAGE,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
});

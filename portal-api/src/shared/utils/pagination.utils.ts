/**
 * Pagination Utilities
 *
 * Provides offset-based pagination for list endpoints.
 * Standard query params: ?page=1&limit=20&sortBy=createdAt&sortOrder=desc
 */

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination query params into MongoDB-compatible options.
 */
export function parsePagination(
  query: PaginationQuery,
  defaultSortBy = 'createdAt',
): PaginationOptions {
  const page = Math.max(1, query.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
  const sortBy = query.sortBy ?? defaultSortBy;
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  return {
    skip: (page - 1) * limit,
    limit,
    sort: { [sortBy]: sortOrder },
  };
}

/**
 * Build pagination metadata for response.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

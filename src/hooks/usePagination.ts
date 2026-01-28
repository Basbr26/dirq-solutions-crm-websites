import { useState, useCallback, useMemo } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  offset: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
  pageSizeOptions: number[];
  getRange: (totalCount: number) => { from: number; to: number };
}

/**
 * Pagination Hook
 * Manages pagination state for lists with page number, page size, and navigation controls.
 * 
 * @param options - Configuration options
 * @param options.initialPage - Starting page number (default: 1)
 * @param options.initialPageSize - Number of items per page (default: 25)
 * @param options.pageSizeOptions - Available page sizes for user selection (default: [10, 25, 50, 100])
 * @returns Pagination state and controls
 * 
 * @example
 * ```tsx
 * const pagination = usePagination({ initialPageSize: 50 });
 * 
 * // Use in query
 * const { data } = useQuery(['items', pagination.page, pagination.pageSize], 
 *   () => fetchItems({ offset: pagination.offset, limit: pagination.pageSize })
 * );
 * 
 * // Navigation controls
 * <button onClick={pagination.prevPage}>Previous</button>
 * <button onClick={pagination.nextPage}>Next</button>
 * <select onChange={(e) => pagination.setPageSize(Number(e.target.value))}>
 *   {pagination.pageSizeOptions.map(size => <option value={size}>{size}</option>)}
 * </select>
 * 
 * // Display range
 * const { from, to } = pagination.getRange(totalCount);
 * // Shows "Showing 26-50 of 100"
 * ```
 */
export function usePagination({
  initialPage = 1,
  initialPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1); // Reset to first page when changing page size
  }, []);

  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const resetPage = useCallback(() => setPage(1), []);

  const getRange = useCallback(
    (totalCount: number) => ({
      from: Math.min(offset + 1, totalCount),
      to: Math.min(offset + pageSize, totalCount),
    }),
    [offset, pageSize]
  );

  return {
    page,
    pageSize,
    offset,
    setPage,
    setPageSize: handleSetPageSize,
    nextPage,
    prevPage,
    resetPage,
    pageSizeOptions,
    getRange,
  };
}

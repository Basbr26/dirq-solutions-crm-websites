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

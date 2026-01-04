import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompanies, useCompanyStats } from '@/features/companies/hooks/useCompanies';
import { supabase } from '@/integrations/supabase/client';
import type { ReactNode } from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCompanies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch companies successfully', async () => {
    const mockCompanies = [
      {
        id: 'company-1',
        name: 'Acme Corp',
        status: 'active',
        created_at: '2026-01-01',
      },
      {
        id: 'company-2',
        name: 'Tech Solutions',
        status: 'active',
        created_at: '2026-01-02',
      },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockResolvedValue({
        data: mockCompanies,
        error: null,
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCompanies);
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Database error');

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should apply filters correctly', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const filters = {
      status: ['active' as const],
      search: 'Acme',
    };

    renderHook(() => useCompanies(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('companies');
    });
  });
});



describe('useCompanyStats', () => {
  it('should calculate company statistics', async () => {
    const mockCompanies = [
      { status: 'active', industry_id: 'ind-1', owner_id: 'user-1' },
      { status: 'active', industry_id: 'ind-1', owner_id: 'user-1' },
      { status: 'prospect', industry_id: 'ind-2', owner_id: 'user-2' },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockCompanies,
        error: null,
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const { result } = renderHook(() => useCompanyStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

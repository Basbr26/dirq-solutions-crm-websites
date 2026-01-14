import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompanies, useCompanyStats } from '@/features/companies/hooks/useCompanies';
import { AuthProvider } from '@/hooks/useAuth';
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
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

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      // Handle companies query
      if (table === 'companies') {
        const chainableMock = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          single: vi.fn(),
        };
        // The final method that actually resolves the query
        // order() is called last, so it should return the promise
        chainableMock.order = vi.fn().mockResolvedValue({
          data: mockCompanies,
          error: null,
          count: mockCompanies.length,
        });
        chainableMock.range = vi.fn().mockReturnValue(chainableMock);
        return chainableMock;
      }
      // Handle auth-related queries (profiles, user_roles)
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', role: 'ADMIN' },
          error: null,
        }),
      };
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);
    
    // Mock auth.getUser for SALES role check
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.data?.companies).toEqual(mockCompanies);
    expect(result.current.data?.count).toBe(mockCompanies.length);
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Database error');

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      // Handle companies query with error
      if (table === 'companies') {
        const chainableMock = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          single: vi.fn(),
        };
        // order() is called last and should reject with error
        chainableMock.order = vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        });
        chainableMock.range = vi.fn().mockReturnValue(chainableMock);
        return chainableMock;
      }
      // Handle auth-related queries (profiles, user_roles)
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', role: 'ADMIN' },
          error: null,
        }),
      };
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.error).toBeTruthy();
  });

  it('should apply filters correctly', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      // Handle companies query
      if (table === 'companies') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          single: vi.fn(),
        };
      }
      // Handle auth-related queries (profiles, user_roles)
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', role: 'ADMIN' },
          error: null,
        }),
      };
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

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      // Handle companies query
      if (table === 'companies') {
        return {
          select: vi.fn().mockResolvedValue({
            data: mockCompanies,
            error: null,
          }),
          single: vi.fn(),
        };
      }
      // Handle auth-related queries (profiles, user_roles)
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', role: 'ADMIN' },
          error: null,
        }),
      };
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

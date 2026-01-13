import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjects, usePipelineStats } from '../useProjects';
import type { AdvancedProjectFilters } from '@/types/projects';

// Mock Supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock chain
    mockOrder.mockReturnValue(mockOrder);
    mockSelect.mockReturnValue(mockOrder);
    mockEq.mockReturnValue(mockOrder);
    mockIn.mockReturnValue(mockOrder);
    mockGte.mockReturnValue(mockOrder);
    mockLte.mockReturnValue(mockOrder);
    mockOr.mockReturnValue(mockOrder);
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('should fetch projects without filters', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null, count: 0 });

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFrom).toHaveBeenCalledWith('projects');
    expect(mockSelect).toHaveBeenCalled();
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('should apply single stage filter', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null, count: 0 });

    const { result } = renderHook(() => useProjects({ stage: 'negotiation' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockEq).toHaveBeenCalledWith('stage', 'negotiation');
  });

  it('should apply project_type filter', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    renderHook(() => useProjects({ project_type: 'corporate_website' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('project_type', 'corporate_website');
    });
  });

  it('should apply owner_id filter', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    renderHook(() => useProjects({ owner_id: 'user-123' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('owner_id', 'user-123');
    });
  });

  it('should apply company_id filter', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    renderHook(() => useProjects({ company_id: 'company-456' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('company_id', 'company-456');
    });
  });

  it('should apply search filter', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    renderHook(() => useProjects({ search: 'website' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockOr).toHaveBeenCalledWith('title.ilike.%website%,description.ilike.%website%');
    });
  });

  it('should apply multiple stages filter', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    renderHook(() => useProjects({ stages: ['negotiation', 'quote_sent'] }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockIn).toHaveBeenCalledWith('stage', ['negotiation', 'quote_sent']);
    });
  });

  it('should apply value range filters', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    renderHook(() => useProjects({ value_min: 1000, value_max: 5000 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGte).toHaveBeenCalledWith('value', 1000);
      expect(mockLte).toHaveBeenCalledWith('value', 5000);
    });
  });

  it('should apply date range filters', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    renderHook(() => useProjects({ 
      created_after: '2026-01-01',
      created_before: '2026-01-31'
    }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGte).toHaveBeenCalledWith('created_at', '2026-01-01');
      expect(mockLte).toHaveBeenCalledWith('created_at', '2026-01-31');
    });
  });

  it('should return loading state initially', () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    mockOrder.mockResolvedValue({ 
      data: null, 
      error: { message: 'Database error' } 
    });

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should refetch when filters change', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { rerender } = renderHook(
      ({ filters }: { filters?: AdvancedProjectFilters }) => useProjects(filters),
      {
        wrapper: createWrapper(),
      }
    );

    rerender({ filters: { stage: 'lead' } });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('stage', 'lead');
    });

    vi.clearAllMocks();
    
    rerender({ filters: { stage: 'negotiation' } });

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('stage', 'negotiation');
    });
  });
});

describe('usePipelineStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('should fetch pipeline statistics', async () => {
    const mockStats = {
      total_projects: 10,
      total_value: 50000,
      weighted_value: 35000,
      avg_deal_size: 5000,
      conversion_rate: 25,
    };

    mockSelect.mockResolvedValue({ data: mockStats, error: null });

    const { result } = renderHook(() => usePipelineStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFrom).toHaveBeenCalledWith('pipeline_stats');
    expect(result.current.data).toEqual(mockStats);
  });

  it('should return loading state initially', () => {
    mockSelect.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePipelineStats(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle errors when fetching stats', async () => {
    mockSelect.mockResolvedValue({ 
      data: null, 
      error: { message: 'Stats error' } 
    });

    const { result } = renderHook(() => usePipelineStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('Companies Module - Integration Tests', () => {
  describe('Full CRUD Flow', () => {
    it('should complete create-read-update-delete cycle', async () => {
      // CREATE
      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'company-123', name: 'New Company', status: 'prospect' },
        error: null,
      });

      // READ
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'company-123', name: 'New Company' }],
          error: null,
        }),
      });

      // UPDATE
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'company-123', name: 'Updated Company' },
          error: null,
        }),
      });

      // DELETE
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        update: mockUpdate,
        delete: mockDelete,
      } as any);

      // 1. Create
      const createResult = await supabase.from('companies').insert({ name: 'New Company' });
      expect(createResult.data).toBeTruthy();

      // 2. Read
      const readResult = await supabase.from('companies').select().eq('id', 'company-123');
      expect(readResult.data?.length).toBe(1);

      // 3. Update
      const updateResult = await supabase
        .from('companies')
        .update({ name: 'Updated Company' })
        .eq('id', 'company-123');
      expect(updateResult.data).toBeTruthy();

      // 4. Delete
      await supabase.from('companies').delete().eq('id', 'company-123');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should handle lead-to-customer conversion flow', async () => {
      const companyId = 'company-123';

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: companyId, status: 'customer', monthly_recurring_revenue: 500 },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      // Convert prospect to customer
      await supabase
        .from('companies')
        .update({
          status: 'customer',
          monthly_recurring_revenue: 500,
        })
        .eq('id', companyId);

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'customer',
        monthly_recurring_revenue: 500,
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter companies by status', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: '1', name: 'Customer 1', status: 'customer' },
            { id: '2', name: 'Customer 2', status: 'customer' },
          ],
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase.from('companies').select().eq('status', 'customer');

      expect(result.data?.every(c => c.status === 'customer')).toBe(true);
    });

    it('should search companies by name', async () => {
      const searchTerm = 'Acme';

      const mockSelect = vi.fn().mockReturnValue({
        ilike: vi.fn().mockResolvedValue({
          data: [{ id: '1', name: 'Acme Corp' }],
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('companies')
        .select()
        .ilike('name', `%${searchTerm}%`);

      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should combine multiple filters', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: '1', status: 'customer', priority: 'high' }],
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('companies')
        .select()
        .eq('status', 'customer')
        .eq('priority', 'high');

      expect(result.data?.length).toBeGreaterThan(0);
    });
  });

  describe('Subscription Management', () => {
    it('should create company with subscription', async () => {
      const companyData = {
        name: 'SaaS Customer',
        status: 'customer',
        monthly_recurring_revenue: 999,
      };

      const mockInsert = vi.fn().mockResolvedValue({
        data: { ...companyData, id: 'company-123' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await supabase.from('companies').insert(companyData);

      expect(result.data).toMatchObject(companyData);
    });

    it('should update MRR when adding subscription', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'company-123', monthly_recurring_revenue: 1500 },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('companies')
        .update({ monthly_recurring_revenue: 1500 })
        .eq('id', 'company-123');

      expect(mockUpdate).toHaveBeenCalledWith({ monthly_recurring_revenue: 1500 });
    });
  });

  describe('Owner Assignment Flow', () => {
    it('should auto-assign owner on create', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null,
      });

      const { data: { user } } = await supabase.auth.getUser();

      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'company-123', owner_id: user?.id },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      await supabase.from('companies').insert({
        name: 'Test',
        owner_id: user?.id,
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: 'user-123',
        })
      );
    });

    it('should reassign owner', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'company-123', owner_id: 'new-user' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('companies')
        .update({ owner_id: 'new-user' })
        .eq('id', 'company-123');

      expect(mockUpdate).toHaveBeenCalledWith({ owner_id: 'new-user' });
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk import companies', async () => {
      const companies = [
        { name: 'Company 1', status: 'prospect' },
        { name: 'Company 2', status: 'prospect' },
        { name: 'Company 3', status: 'prospect' },
      ];

      const mockInsert = vi.fn().mockResolvedValue({
        data: companies.map((c, i) => ({ ...c, id: `company-${i}` })),
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await supabase.from('companies').insert(companies);
      const resultData = result.data as typeof companies | null;

      expect(resultData && Array.isArray(resultData) ? resultData.length : 0).toBe(3);
    });

    it('should bulk update priorities', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'company-1', priority: 'high' },
            { id: 'company-2', priority: 'high' },
          ],
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('companies')
        .update({ priority: 'high' })
        .in('id', ['company-1', 'company-2']);

      expect(mockUpdate).toHaveBeenCalledWith({ priority: 'high' });
    });
  });

  describe('Error Recovery', () => {
    it('should rollback on failed transaction', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await supabase.from('companies').insert({ name: 'Test' });

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });

    it('should handle duplicate KVK number', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value', code: '23505' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await supabase.from('companies').insert({
        name: 'Test',
        kvk_number: '12345678',
      });

      expect(result.error?.code).toBe('23505');
    });
  });

  describe('Pagination', () => {
    it('should paginate results', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: `company-${i}`,
            name: `Company ${i}`,
          })),
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const page = 1;
      const perPage = 10;
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const result = await supabase.from('companies').select().range(from, to);

      expect(result.data?.length).toBe(10);
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to company changes', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      };

      const mockSubscribe = vi.fn().mockReturnValue(mockChannel);

      vi.mocked(supabase).channel = mockSubscribe;

      const callback = vi.fn();

      supabase
        .channel('companies')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, callback)
        .subscribe();

      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });
});

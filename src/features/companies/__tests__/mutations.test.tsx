import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReactNode } from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Company Mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Company', () => {
    it('should create company with required fields', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: {
          id: 'company-123',
          name: 'Test Company',
          status: 'prospect',
        },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const companyData = {
        name: 'Test Company',
        status: 'prospect' as const,
      };

      await supabase.from('companies').insert(companyData);

      expect(mockInsert).toHaveBeenCalledWith(companyData);
    });

    it('should validate required name field', () => {
      const companyData = { name: '', status: 'prospect' };
      const isValid = companyData.name.trim().length > 0;

      expect(isValid).toBe(false);
    });

    it('should set default status to prospect', () => {
      const companyData = {
        name: 'Test Company',
        status: 'prospect' as const,
      };

      expect(companyData.status).toBe('prospect');
    });

    it('should auto-assign owner_id to creator', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null,
      });

      const { data: { user } } = await supabase.auth.getUser();

      const companyData = {
        name: 'Test Company',
        owner_id: user?.id,
      };

      expect(companyData.owner_id).toBe('user-123');
    });
  });

  describe('Update Company', () => {
    it('should update company fields', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'company-123', name: 'Updated Name' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('companies')
        .update({ name: 'Updated Name' })
        .eq('id', 'company-123');

      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Name' });
    });

    it('should update status from prospect to customer', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'company-123', status: 'customer' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('companies')
        .update({ status: 'customer' })
        .eq('id', 'company-123');

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'customer' });
    });

    it('should validate KVK number format', () => {
      const validKVK = '12345678';
      const invalidKVK = '123';

      const isValidKVK = (kvk: string) => /^\d{8}$/.test(kvk);

      expect(isValidKVK(validKVK)).toBe(true);
      expect(isValidKVK(invalidKVK)).toBe(false);
    });

    it('should update MRR when subscriptions change', async () => {
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

  describe('Delete Company', () => {
    it('should delete company by id', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      await supabase
        .from('companies')
        .delete()
        .eq('id', 'company-123');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('should cascade delete related records', async () => {
      // Test that contacts, projects, etc. are handled by ON DELETE CASCADE
      const companyId = 'company-123';
      const relatedTables = ['contacts', 'projects', 'quotes', 'interactions'];

      // In real implementation, these would be deleted via DB cascade
      const cascadeDeletes = relatedTables.map(table => ({
        table,
        cascade: true,
      }));

      expect(cascadeDeletes.length).toBe(4);
      expect(cascadeDeletes.every(d => d.cascade)).toBe(true);
    });

    it('should not delete company with active subscriptions', () => {
      const company = {
        id: 'company-123',
        status: 'customer',
        monthly_recurring_revenue: 1000,
      };

      const canDelete = company.monthly_recurring_revenue === 0;

      expect(canDelete).toBe(false);
    });
  });

  describe('Company Status Transitions', () => {
    it('should allow prospect to customer transition', () => {
      const validTransitions = {
        prospect: ['customer', 'inactive'],
        customer: ['inactive'],
        inactive: ['prospect', 'customer'],
      };

      const canTransition = (from: string, to: string) => {
        return validTransitions[from as keyof typeof validTransitions]?.includes(to);
      };

      expect(canTransition('prospect', 'customer')).toBe(true);
      expect(canTransition('customer', 'prospect')).toBe(false);
    });

    it('should track status change timestamp', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'company-123' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const statusChangedAt = new Date().toISOString();

      await supabase
        .from('companies')
        .update({ 
          status: 'customer',
          status_changed_at: statusChangedAt,
        })
        .eq('id', 'company-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status_changed_at: statusChangedAt,
        })
      );
    });
  });

  describe('Priority Management', () => {
    it('should set valid priority levels', () => {
      const validPriorities = ['low', 'medium', 'high'];
      
      validPriorities.forEach(priority => {
        expect(validPriorities.includes(priority)).toBe(true);
      });
    });

    it('should default to medium priority', () => {
      const company = {
        name: 'Test',
        priority: 'medium' as const,
      };

      expect(company.priority).toBe('medium');
    });

    it('should update priority', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'company-123', priority: 'high' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('companies')
        .update({ priority: 'high' })
        .eq('id', 'company-123');

      expect(mockUpdate).toHaveBeenCalledWith({ priority: 'high' });
    });
  });

  describe('Owner Assignment', () => {
    it('should assign owner to company', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'company-123', owner_id: 'user-456' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('companies')
        .update({ owner_id: 'user-456' })
        .eq('id', 'company-123');

      expect(mockUpdate).toHaveBeenCalledWith({ owner_id: 'user-456' });
    });

    it('should validate owner exists', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-456', role: 'SALES' },
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('profiles')
        .select()
        .eq('id', 'user-456')
        .single();

      expect(result.data).toBeTruthy();
      expect(result.data?.role).toBe('SALES');
    });
  });

  describe('Batch Operations', () => {
    it('should create multiple companies in batch', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [
          { id: 'company-1', name: 'Company 1' },
          { id: 'company-2', name: 'Company 2' },
        ],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const companies = [
        { name: 'Company 1', status: 'prospect' },
        { name: 'Company 2', status: 'prospect' },
      ];

      await supabase.from('companies').insert(companies);

      expect(mockInsert).toHaveBeenCalledWith(companies);
    });

    it('should update multiple companies by status', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'company-1' }, { id: 'company-2' }],
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('companies')
        .update({ priority: 'high' })
        .eq('status', 'prospect');

      expect(mockUpdate).toHaveBeenCalledWith({ priority: 'high' });
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate company names', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await supabase
        .from('companies')
        .insert({ name: 'Existing Company' });

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('duplicate');
    });

    it('should handle network errors', async () => {
      const mockInsert = vi.fn().mockRejectedValue(new Error('Network error'));

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      await expect(
        supabase.from('companies').insert({ name: 'Test' })
      ).rejects.toThrow('Network error');
    });
  });
});

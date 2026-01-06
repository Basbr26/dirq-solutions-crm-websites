import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Company, CompanyFilters } from '@/types/crm';
import { useAuth } from '@/hooks/useAuth';

export function useCompanies(filters?: CompanyFilters) {
  const { role } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const query = useQuery({
    queryKey: ['companies', filters, page, role],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select(`
          *,
          industry:industries(*),
          owner:profiles!companies_owner_id_fkey(id, voornaam, achternaam, email)
        `, { count: 'exact' });

      // All authenticated users can see all companies

      // Apply filters
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters?.industry_id && filters.industry_id.length > 0) {
        query = query.in('industry_id', filters.industry_id);
      }
      if (filters?.owner_id && filters.owner_id.length > 0) {
        query = query.in('owner_id', filters.owner_id);
      }
      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Sorting
      query = query.order('updated_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        companies: data as Company[],
        count: count || 0,
        page,
        pageSize,
        hasMore: (count || 0) > page * pageSize
      };
    },
  });

  return {
    ...query,
    page,
    setPage,
    pageSize
  };
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          industry:industries(*),
          owner:profiles!companies_owner_id_fkey(id, voornaam, achternaam, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Company;
    },
    enabled: !!id,
  });
}

export function useCompanyStats() {
  const { role } = useAuth();

  return useQuery({
    queryKey: ['company-stats', role],
    queryFn: async () => {
      let query = supabase.from('companies').select('status, industry_id, owner_id');

      // RBAC filtering
      if (role === 'SALES') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq('owner_id', user.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter(c => c.status === 'active').length,
        prospects: data.filter(c => c.status === 'prospect').length,
        inactive: data.filter(c => c.status === 'inactive').length,
        by_industry: {} as Record<string, number>,
        by_owner: {} as Record<string, number>
      };

      // Group by industry
      data.forEach(company => {
        if (company.industry_id) {
          stats.by_industry[company.industry_id] = (stats.by_industry[company.industry_id] || 0) + 1;
        }
      });

      // Group by owner
      data.forEach(company => {
        stats.by_owner[company.owner_id] = (stats.by_owner[company.owner_id] || 0) + 1;
      });

      return stats;
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contact } from '@/types/crm';
import { useAuth } from '@/hooks/useAuth';

interface UseContactsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  companyId?: string;
  isPrimary?: boolean;
  isDecisionMaker?: boolean;
}

export function useContacts(params: UseContactsParams) {
  const { role } = useAuth();

  return useQuery({
    queryKey: ['contacts', params, role],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name, status),
          owner:profiles!contacts_owner_id_fkey(id, full_name)
        `, { count: 'exact' });

      // RBAC: SALES users only see their own contacts + contacts of their companies
      if (role === 'SALES') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (params.companyId) {
            // When viewing a specific company, check if user owns the company
            const { data: companyData } = await supabase
              .from('companies')
              .select('owner_id')
              .eq('id', params.companyId)
              .single();
            
            // If user owns the company, show all contacts for that company
            // Otherwise, only show contacts owned by the user
            if (companyData?.owner_id === user.id) {
              query = query.eq('company_id', params.companyId);
            } else {
              query = query.eq('company_id', params.companyId).eq('owner_id', user.id);
            }
          } else {
            // General contact list: show own contacts + contacts from owned companies
            const companiesSubquery = `(select id from companies where owner_id = '${user.id}')`;
            query = query.or(`owner_id.eq.${user.id},company_id.in.${companiesSubquery}`);
          }
        }
      } else if (params.companyId) {
        // For ADMIN/MANAGER, directly apply company filter if provided
        query = query.eq('company_id', params.companyId);
      }
      // ADMIN and MANAGER see all contacts

      // Apply filters
      if (params.search) {
        query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%,position.ilike.%${params.search}%`);
      }

      // Remove duplicate companyId filter since it's handled above
      // if (params.companyId) {
      //   query = query.eq('company_id', params.companyId);
      // }

      if (params.isPrimary !== undefined) {
        query = query.eq('is_primary', params.isPrimary);
      }

      if (params.isDecisionMaker !== undefined) {
        query = query.eq('is_decision_maker', params.isDecisionMaker);
      }

      // Apply pagination
      const from = (params.page - 1) * params.pageSize;
      const to = from + params.pageSize - 1;
      query = query.range(from, to);

      // Sort by last name
      query = query.order('last_name', { ascending: true });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        contacts: data as Contact[],
        count: count || 0,
        page: params.page,
        pageSize: params.pageSize,
        hasMore: (count || 0) > params.page * params.pageSize
      };
    },
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name, status),
          owner:profiles!contacts_owner_id_fkey(id, full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Contact;
    },
    enabled: !!id,
  });
}


export function useContactStats() {
  const { role } = useAuth();

  return useQuery({
    queryKey: ['contact-stats', role],
    queryFn: async () => {
      let query = supabase.from('contacts').select('is_primary, is_decision_maker, company_id');

      // RBAC filtering
      if (role === 'SALES') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: ownedCompanies } = await supabase
            .from('companies')
            .select('id')
            .eq('owner_id', user.id);
          
          const companyIds = ownedCompanies?.map(c => c.id) || [];
          query = query.or(`owner_id.eq.${user.id},company_id.in.(${companyIds.join(',')})`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = {
        total: data.length,
        primary: data.filter(c => c.is_primary).length,
        decision_makers: data.filter(c => c.is_decision_maker).length,
        with_company: data.filter(c => c.company_id).length,
      };

      return stats;
    },
  });
}

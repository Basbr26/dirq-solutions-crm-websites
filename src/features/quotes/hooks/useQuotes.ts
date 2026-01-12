/**
 * Quotes Query Hooks
 * React Query hooks for fetching quotes data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Quote, QuoteStats, QuoteFilters } from '@/types/quotes';

export function useQuotes(filters?: QuoteFilters) {
  return useQuery({
    queryKey: ['quotes', filters],
    queryFn: async () => {
      let query = supabase
        .from('quotes')
        .select(`
          *,
          company:companies!quotes_company_id_fkey (id, name, email, phone),
          project:projects!quotes_project_id_fkey (id, title),
          owner:profiles!quotes_owner_id_fkey (id, voornaam, achternaam, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.company_id) {
        query = query.eq('company_id', filters.company_id);
      }
      if (filters?.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,quote_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Quote[];
    },
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          company:companies!quotes_company_id_fkey (id, name, email, phone),
          project:projects!quotes_project_id_fkey (
            id, 
            title, 
            contact:contacts!projects_contact_id_fkey (
              id, 
              first_name, 
              last_name, 
              email, 
              phone, 
              position
            )
          ),
          owner:profiles!quotes_owner_id_fkey (id, voornaam, achternaam, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Quote;
    },
    enabled: !!id,
  });
}

export function useQuoteItems(quoteId: string) {
  return useQuery({
    queryKey: ['quote-items', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('item_order');

      if (error) throw error;
      return data;
    },
    enabled: !!quoteId,
  });
}

export function useQuoteStats() {
  return useQuery({
    queryKey: ['quote-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('status, total_amount');

      if (error) throw error;

      const stats: QuoteStats = {
        total: data.length,
        draft: data.filter(q => q.status === 'draft').length,
        sent: data.filter(q => q.status === 'sent').length,
        accepted: data.filter(q => q.status === 'accepted').length,
        rejected: data.filter(q => q.status === 'rejected').length,
        total_value: data.reduce((sum, q) => sum + (q.total_amount || 0), 0),
        avg_value: data.length > 0 ? data.reduce((sum, q) => sum + (q.total_amount || 0), 0) / data.length : 0,
      };

      return stats;
    },
  });
}

/**
 * Quote Mutations
 * Create, update, delete operations for quotes
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CreateQuoteInput, UpdateQuoteInput, QuoteStatus } from '@/types/quotes';
import { notifyQuoteStatusChange } from '@/lib/crmNotifications';

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQuoteInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate quote number
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .like('quote_number', `Q-${year}-%`);
      
      const quoteNumber = `Q-${year}-${String((count || 0) + 1).padStart(3, '0')}`;

      // Calculate totals
      const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const tax_rate = input.tax_rate || 21;
      const tax_amount = (subtotal * tax_rate) / 100;
      const total_amount = subtotal + tax_amount;

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          ...input,
          quote_number: quoteNumber,
          subtotal,
          tax_rate,
          tax_amount,
          total_amount,
          owner_id: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote items
      const items = input.items.map((item, index) => ({
        quote_id: quote.id,
        ...item,
        item_order: item.item_order ?? index,
        total_price: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote-stats'] });
      toast.success('Offerte aangemaakt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij aanmaken offerte: ${error.message}`);
    },
  });
}

export function useUpdateQuote(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateQuoteInput) => {
      const { data, error } = await supabase
        .from('quotes')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', id] });
      queryClient.invalidateQueries({ queryKey: ['quote-stats'] });
      toast.success('Offerte bijgewerkt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij bijwerken offerte: ${error.message}`);
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote-stats'] });
      toast.success('Offerte verwijderd');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij verwijderen offerte: ${error.message}`);
    },
  });
}

export function useUpdateQuoteStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: QuoteStatus) => {
      const updateData: any = { status };
      
      // Set timestamp based on status
      if (status === 'sent' && !updateData.sent_at) {
        updateData.sent_at = new Date().toISOString();
      } else if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (quote, status) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', id] });
      queryClient.invalidateQueries({ queryKey: ['quote-stats'] });
      
      const statusLabels: Record<QuoteStatus, string> = {
        draft: 'Concept',
        sent: 'Verzonden',
        viewed: 'Bekeken',
        accepted: 'Geaccepteerd',
        rejected: 'Afgewezen',
        expired: 'Verlopen',
      };
      
      toast.success(`Offerte status: ${statusLabels[status]}`);

      // Send notification for accepted/rejected status
      if (status === 'accepted' || status === 'rejected') {
        // Fetch company name for notification
        const { data: quoteData } = await supabase
          .from('quotes')
          .select('title, owner_id, companies(name)')
          .eq('id', id)
          .single();

        if (quoteData) {
          await notifyQuoteStatusChange(
            id,
            status,
            quoteData.owner_id,
            (quoteData as any).companies?.name || 'Onbekend bedrijf',
            quoteData.title
          );
        }
      }
    },
    onError: (error: Error) => {
      toast.error(`Fout bij status wijziging: ${error.message}`);
    },
  });
}

export function useQuoteMutations(id?: string) {
  const create = useCreateQuote();
  const update = useUpdateQuote(id || '');
  const deleteQuote = useDeleteQuote();
  const updateStatus = useUpdateQuoteStatus(id || '');
  
  return {
    create,
    update: id ? update : null,
    delete: deleteQuote,
    updateStatus: id ? updateStatus : null,
  };
}

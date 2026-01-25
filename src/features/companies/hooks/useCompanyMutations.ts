import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CompanyFormData, Company } from '@/types/crm';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if KVK number already exists
      if (data.kvk_number) {
        const { data: existing } = await supabase
          .from('companies')
          .select('id, name')
          .eq('kvk_number', data.kvk_number)
          .maybeSingle();

        if (existing) {
          throw new Error(`Dit KVK nummer is al in gebruik bij bedrijf "${existing.name}"`);
        }
      }

      const { data: company, error } = await supabase
        .from('companies')
        .insert([{
          ...data,
          owner_id: user.id,
        }])
        .select(`
          *,
          industry:industries(*),
          owner:profiles!companies_owner_id_fkey(id, voornaam, achternaam, email)
        `)
        .single();

      if (error) {
        // Check for duplicate KVK constraint violation
        if (error.code === '23505' && error.message.includes('companies_kvk_number_key')) {
          throw new Error('Dit KVK nummer is al in gebruik');
        }
        throw error;
      }
      return company as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      haptics.success();
      toast.success('Bedrijf succesvol aangemaakt');
    },
    onError: (error: Error) => {
      haptics.error();
      toast.error('Fout bij aanmaken bedrijf', {
        description: error.message,
      });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CompanyFormData> }) => {
      const { data: company, error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          industry:industries(*),
          owner:profiles!companies_owner_id_fkey(id, voornaam, achternaam, email)
        `)
        .single();

      if (error) throw error;
      return company as Company;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', data.id] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      toast.success('Bedrijf succesvol bijgewerkt');
    },
    onError: (error: Error) => {
      toast.error('Fout bij bijwerken bedrijf', {
        description: error.message,
      });
    },
  });
}


export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
      // Check of er daadwerkelijk iets verwijderd is
      if (!data || data.length === 0) {
        throw new Error('Bedrijf kon niet worden verwijderd. Mogelijk heb je geen toestemming.');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      toast.success('Bedrijf succesvol verwijderd');
    },
    onError: (error: Error) => {
      toast.error('Fout bij verwijderen bedrijf', {
        description: error.message,
      });
    },
  });
}

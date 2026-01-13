import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CompanyFormData, Company } from '@/types/crm';
import { toast } from 'sonner';

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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

      if (error) throw error;
      return company as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      toast.success('Bedrijf succesvol aangemaakt');
    },
    onError: (error: Error) => {
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

// Verwijderen van bedrijven is uitgeschakeld

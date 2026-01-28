import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CompanyFormData, Company } from '@/types/crm';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useTranslation } from 'react-i18next';

/**
 * Create Company Mutation Hook
 * Creates a new company record with automatic owner assignment and duplicate prevention.
 * 
 * @returns React Query mutation for creating companies
 * 
 * @example
 * ```tsx
 * const createCompany = useCreateCompany();
 * 
 * createCompany.mutate(
 *   { name: 'Acme Corp', email: 'info@acme.com', status: 'prospect' },
 *   {
 *     onSuccess: (company) => {
 *       console.log('Created:', company.id);
 *       navigate(`/companies/${company.id}`);
 *     },
 *     onError: (error) => {
 *       console.error('Failed:', error.message);
 *     }
 *   }
 * );
 * ```
 * 
 * @throws {Error} 'Dit KVK nummer is al in gebruik' - Duplicate KVK number
 * @throws {Error} 'Een bedrijf met deze naam bestaat al' - Duplicate name
 */
export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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

      if (error) {
        // Handle database constraint violations
        if (error.code === '23505') {
          if (error.message.includes('companies_kvk_number_key')) {
            throw new Error('Dit KVK nummer is al in gebruik');
          }
          if (error.message.includes('companies_name_unique_idx')) {
            throw new Error('Een bedrijf met deze naam bestaat al');
          }
        }
        throw error;
      }
      return company as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      haptics.success();
      toast.success(t('toast.company.created'));
    },
    onError: (error: Error) => {
      haptics.error();
      // Don't show toast - error is handled in the form's duplicate dialog
      if (error.message.includes('bestaat al') || error.message.includes('is al in gebruik')) {
        return;
      }
      toast.error(t('toast.company.createError'), {
        description: error.message,
      });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      toast.success(t('toast.company.updated'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.company.updateError'), {
        description: error.message,
      });
    },
  });
}


export function useDeleteCompany() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      toast.success(t('toast.company.deleted'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.company.deleteError'), {
        description: error.message,
      });
    },
  });
}

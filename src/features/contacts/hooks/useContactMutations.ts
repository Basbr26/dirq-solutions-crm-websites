import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContactFormData, Contact } from '@/types/crm';
import { toast } from 'sonner';

// Combined hook for all contact mutations
export function useContactMutations() {
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  return {
    createContact,
    updateContact,
    deleteContact,
  };
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ContactFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: contact, error } = await supabase
        .from('contacts')
        .insert([{
          ...data,
          owner_id: user.id,
        }])
        .select(`
          *,
          company:companies(*),
          owner:profiles!contacts_owner_id_fkey(id, voornaam, achternaam, email)
        `)
        .single();

      if (error) throw error;
      return contact as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
      toast.success('Contact succesvol aangemaakt');
    },
    onError: (error: Error) => {
      toast.error('Fout bij aanmaken contact', {
        description: error.message,
      });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContactFormData> }) => {
      const { data: contact, error } = await supabase
        .from('contacts')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          company:companies(*),
          owner:profiles!contacts_owner_id_fkey(id, voornaam, achternaam, email)
        `)
        .single();

      if (error) throw error;
      return contact as Contact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', data.id] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
      toast.success('Contact succesvol bijgewerkt');
    },
    onError: (error: Error) => {
      toast.error('Fout bij bijwerken contact', {
        description: error.message,
      });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
      
      // Check if anything was actually deleted
      if (!data || data.length === 0) {
        throw new Error('Contact kon niet worden verwijderd. Mogelijk heb je geen toestemming.');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
      toast.success('Contact succesvol verwijderd');
    },
    onError: (error: Error) => {
      toast.error('Fout bij verwijderen contact', {
        description: error.message,
      });
    },
  });
}

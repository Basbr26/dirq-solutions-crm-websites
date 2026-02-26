import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContactFormData, Contact } from '@/types/crm';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useTranslation } from 'react-i18next';

/**
 * Combined Contact Mutations Hook
 * Provides all contact mutation operations (create, update, delete) in one hook.
 * Convenience wrapper around individual mutation hooks.
 * 
 * @returns Object with mutation hooks
 * @returns createContact - Create contact mutation
 * @returns updateContact - Update contact mutation
 * @returns deleteContact - Delete contact mutation
 * 
 * @example
 * ```tsx
 * const { createContact, updateContact, deleteContact } = useContactMutations();
 * 
 * const handleCreate = (data) => {
 *   createContact.mutate(data, {
 *     onSuccess: () => console.log('Created!')
 *   });
 * };
 * ```
 */
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

/**
 * Create Contact Mutation Hook
 * Creates a new contact with automatic owner assignment.
 * 
 * @returns React Query mutation for creating contacts
 * 
 * @example
 * ```tsx
 * const createContact = useCreateContact();
 * 
 * createContact.mutate(
 *   {
 *     first_name: 'John',
 *     last_name: 'Doe',
 *     email: 'john@example.com',
 *     company_id: 'company-123'
 *   },
 *   {
 *     onSuccess: (contact) => navigate(`/contacts/${contact.id}`)
 *   }
 * );
 * ```
 */
export function useCreateContact() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      haptics.success();
      toast.success('Contact succesvol aangemaakt');
    },
    onError: (error: Error) => {
      haptics.error();
      toast.error('Fout bij aanmaken contact', {
        description: error.message,
      });
    },
  });
}

/**
 * Update Contact Mutation Hook
 * Updates existing contact information.
 * 
 * @returns React Query mutation for updating contacts
 * 
 * @example
 * ```tsx
 * const updateContact = useUpdateContact();
 * 
 * updateContact.mutate(
 *   {
 *     id: 'contact-123',
 *     data: { position: 'CTO', is_decision_maker: true }
 *   },
 *   {
 *     onSuccess: () => toast.success('Updated')
 *   }
 * );
 * ```
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      toast.success(t('toast.contact.updated'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.contact.updateError'), {
        description: error.message,
      });
    },
  });
}

/**
 * Delete Contact Mutation Hook
 * Permanently deletes a contact record.
 * 
 * @returns React Query mutation for deleting contacts
 * 
 * @example
 * ```tsx
 * const deleteContact = useDeleteContact();
 * 
 * deleteContact.mutate('contact-123', {
 *   onSuccess: () => {
 *     toast.success('Deleted');
 *     navigate('/contacts');
 *   }
 * });
 * ```
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      haptics.success();
      toast.success(t('toast.contact.deleted'));
    },
    onError: (error: Error) => {
      haptics.error();
      toast.error(t('toast.contact.deleteError'), {
        description: error.message,
      });
    },
  });
}

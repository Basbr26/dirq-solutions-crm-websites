import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export interface HRNote {
  id: string;
  employee_id: string;
  created_by: string;
  title: string;
  content: string;
  category: string;
  visibility: string;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_completed: boolean;
  tags: string[] | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by_profile?: {
    id: string;
    voornaam: string;
    achternaam: string;
    avatar_url: string | null;
  };
}

export interface CreateNoteInput {
  employee_id: string;
  title: string;
  content: string;
  category: string;
  visibility?: string;
  follow_up_required?: boolean;
  follow_up_date?: string | null;
  tags?: string[];
  is_pinned?: boolean;
}

export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  category?: string;
  visibility?: string;
  follow_up_required?: boolean;
  follow_up_date?: string | null;
  follow_up_completed?: boolean;
  tags?: string[];
  is_pinned?: boolean;
}

/**
 * Employee HR Notes Query Hook
 * Fetches all HR notes for a specific employee.
 * Notes are sorted by pinned status first, then by creation date (newest first).
 * 
 * @param employeeId - The employee's user ID
 * @returns React Query result with array of HR notes
 * @returns data - Array of HRNote objects with creator profile info
 * 
 * @example
 * ```tsx
 * const { data: notes, isLoading } = useEmployeeNotes(employee.id);
 * 
 * return (
 *   <div>
 *     {notes?.filter(n => n.is_pinned).map(note => (
 *       <PinnedNote key={note.id} note={note} />
 *     ))}
 *     {notes?.filter(n => !n.is_pinned).map(note => (
 *       <NoteCard key={note.id} note={note} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useEmployeeNotes(employeeId: string) {
  return useQuery({
    queryKey: ['hr-notes', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_notes')
        .select(`
          *,
          created_by_profile:profiles!hr_notes_created_by_fkey(
            id,
            voornaam,
            achternaam,
            avatar_url
          )
        `)
        .eq('employee_id', employeeId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HRNote[];
    },
    enabled: !!employeeId,
  });
}

// Get note statistics
export function useNoteStats(employeeId: string) {
  return useQuery({
    queryKey: ['hr-note-stats', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_employee_note_stats', { p_employee_id: employeeId });

      if (error) throw error;
      return data as {
        total_notes: number;
        pending_follow_ups: number;
        last_30_days: number;
        by_category: Record<string, number>;
      };
    },
    enabled: !!employeeId,
  });
}

// Create a new note
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('hr_notes')
        .insert({
          ...input,
          created_by: user.data.user.id,
          visibility: input.visibility || 'private',
          follow_up_required: input.follow_up_required || false,
          follow_up_completed: false,
          is_pinned: input.is_pinned || false,
        })
        .select(`
          *,
          created_by_profile:profiles!hr_notes_created_by_fkey(
            id,
            voornaam,
            achternaam,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data as HRNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hr-notes', data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['hr-note-stats', data.employee_id] });
      toast.success('Notitie toegevoegd');
    },
    onError: (error) => {
      logger.error('Failed to create employee note', { error });
      toast.error('Notitie toevoegen mislukt');
    },
  });
}

// Update an existing note
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateNoteInput) => {
      const { data, error } = await supabase
        .from('hr_notes')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          created_by_profile:profiles!hr_notes_created_by_fkey(
            id,
            voornaam,
            achternaam,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data as HRNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hr-notes', data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['hr-note-stats', data.employee_id] });
      toast.success('Notitie bijgewerkt');
    },
    onError: (error) => {
      logger.error('Failed to update employee note', { error });
      toast.error('Notitie bijwerken mislukt');
    },
  });
}

// Delete a note
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, employeeId }: { noteId: string; employeeId: string }) => {
      const { error } = await supabase
        .from('hr_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      return { noteId, employeeId };
    },
    onSuccess: (vars) => {
      queryClient.invalidateQueries({ queryKey: ['hr-notes', vars.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['hr-note-stats', vars.employeeId] });
      toast.success('Notitie verwijderd');
    },
    onError: (error) => {
      logger.error('Failed to delete employee note', { error });
      toast.error('Notitie verwijderen mislukt');
    },
  });
}

// Toggle pin status
export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { data, error } = await supabase
        .from('hr_notes')
        .update({ is_pinned: !isPinned })
        .eq('id', noteId)
        .select(`
          *,
          created_by_profile:profiles!hr_notes_created_by_fkey(
            id,
            voornaam,
            achternaam,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data as HRNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hr-notes', data.employee_id] });
      toast.success(data.is_pinned ? 'Notitie vastgepind' : 'Notitie losgemaakt');
    },
    onError: (error) => {
      logger.error('Failed to toggle note pin', { error });
      toast.error('Pin wijzigen mislukt');
    },
  });
}

// Complete a follow-up
export function useCompleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { data, error } = await supabase
        .from('hr_notes')
        .update({ follow_up_completed: true })
        .eq('id', noteId)
        .select(`
          *,
          created_by_profile:profiles!hr_notes_created_by_fkey(
            id,
            voornaam,
            achternaam,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data as HRNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hr-notes', data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['hr-note-stats', data.employee_id] });
      toast.success('Follow-up voltooid');
    },
    onError: (error) => {
      logger.error('Failed to complete follow-up', { error });
      toast.error('Follow-up voltooien mislukt');
    },
  });
}

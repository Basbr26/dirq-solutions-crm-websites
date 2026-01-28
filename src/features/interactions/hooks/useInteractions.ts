import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { handleInteractionCreated } from '@/lib/followUpAutomation';
import { InteractionType, InteractionDirection, TaskStatus } from '@/types/crm';
import { useTranslation } from 'react-i18next';

export interface Interaction {
  id: string;
  company_id: string;
  contact_id: string | null;
  lead_id: string | null;
  quote_id: string | null;
  type: InteractionType;
  direction: InteractionDirection | null;
  subject: string;
  description: string | null;
  duration_minutes: number | null;
  scheduled_at: string | null;
  completed_at: string | null;
  is_task: boolean;
  task_status: TaskStatus | null;
  due_date: string | null;
  user_id: string;
  attachments: string[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined data
  company?: {
    id: string;
    name: string;
  };
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  user?: {
    id: string;
    voornaam: string;
    achternaam: string;
    email?: string;
  };
}

export interface InteractionFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  companyId?: string;
  contactId?: string;
  leadId?: string; // For filtering by project/lead
  quoteId?: string; // For filtering by quote
  isTask?: boolean;
  taskStatus?: string;
}

export interface CreateInteractionData {
  company_id: string;
  contact_id?: string;
  lead_id?: string;
  quote_id?: string;
  type: InteractionType;
  direction?: InteractionDirection;
  subject: string;
  description?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  is_task?: boolean;
  task_status?: TaskStatus;
  due_date?: string;
  completed_at?: string;
  tags?: string[];
}

/**
 * Interactions Query Hook
 * Fetches paginated list of interactions (calls, emails, meetings, tasks) with RBAC filtering.
 * SALES role users only see their own interactions; ADMIN/MANAGER see all.
 * 
 * @param filters - Optional filters to refine results
 * @param filters.companyId - Filter by company ID
 * @param filters.contactId - Filter by contact ID
 * @param filters.leadId - Filter by project/lead ID
 * @param filters.quoteId - Filter by quote ID
 * @param filters.type - Filter by interaction type (call, email, meeting, note)
 * @param filters.isTask - Filter for tasks only
 * @param filters.taskStatus - Filter by task status (pending, in_progress, completed, cancelled)
 * @param filters.search - Search in subject/description
 * @param filters.page - Page number (default: 1)
 * @param filters.pageSize - Items per page (default: 20)
 * @returns Query result with interactions data and metadata
 * 
 * @example
 * ```tsx
 * // Company's interactions
 * const { data } = useInteractions({ companyId: 'company-123' });
 * 
 * // Pending tasks only
 * const { data } = useInteractions({ 
 *   isTask: true, 
 *   taskStatus: 'pending' 
 * });
 * 
 * // Quote-related communications
 * const { data } = useInteractions({ quoteId: 'quote-123', type: 'email' });
 * ```
 */
export function useInteractions(filters: InteractionFilters = {}) {
  const { user, role } = useAuth();
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;

  return useQuery({
    queryKey: ['interactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('interactions')
        .select(`
          *,
          company:companies(id, name),
          contact:contacts(id, first_name, last_name),
          user:profiles!interactions_user_id_fkey(id, voornaam, achternaam, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // RBAC filtering
      if (role === 'SALES') {
        query = query.eq('user_id', user?.id);
      }

      // Apply filters
      if (filters.search) {
        query = query.or(`subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.companyId) {
        query = query.eq('company_id', filters.companyId);
      }

      if (filters.contactId && filters.contactId !== 'new') {
        query = query.eq('contact_id', filters.contactId);
      }

      if (filters.leadId && filters.leadId !== 'new') {
        query = query.eq('lead_id', filters.leadId);
      }

      if (filters.quoteId && filters.quoteId !== 'new') {
        query = query.eq('quote_id', filters.quoteId);
      }

      if (filters.isTask !== undefined) {
        query = query.eq('is_task', filters.isTask);
      }

      if (filters.taskStatus) {
        query = query.eq('task_status', filters.taskStatus);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        interactions: data as Interaction[],
        count: count || 0,
      };
    },
    enabled: !!user,
  });
}

export function useCreateInteraction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: CreateInteractionData) => {
      const { data: interaction, error } = await supabase
        .from('interactions')
        .insert([{
          ...data,
          user_id: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Automatically create follow-up task for physical mail
      if (interaction.type === 'physical_mail') {
        await handleInteractionCreated({
          id: interaction.id,
          type: interaction.type,
          company_id: interaction.company_id,
          contact_id: interaction.contact_id,
          user_id: interaction.user_id,
        });
      }

      return interaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      toast.success(t('toast.interaction.created'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.interaction.createError', { message: error.message }));
    },
  });
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateInteractionData> }) => {
      const { data: interaction, error } = await supabase
        .from('interactions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return interaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      toast.success(t('toast.interaction.updated'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.interaction.updateError', { message: error.message }));
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      // First delete any linked calendar events (orphaned events without interaction_id)
      // This handles old events created before interaction_id foreign key was added
      const { error: calendarError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('interaction_id', id);

      if (calendarError) {
        logger.warn('Could not delete linked calendar events', { interactionId: id, error: calendarError });
        // Don't throw - continue with interaction delete
      }

      // Delete the interaction (CASCADE will handle new events with FK)
      const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] }); // Also refresh calendar
      toast.success(t('toast.interaction.deleted'));
    },
    onError: (error: Error) => {
      toast.error(t('toast.interaction.deleteError', { message: error.message }));
    },
  });
}

export function useInteractionStats() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['interaction-stats', role],
    queryFn: async () => {
      let query = supabase
        .from('interactions')
        .select('type, is_task, task_status', { count: 'exact' });

      if (role === 'SALES') {
        query = query.eq('user_id', user?.id);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      const stats = {
        total: count || 0,
        calls: data?.filter(i => i.type === 'call').length || 0,
        meetings: data?.filter(i => i.type === 'meeting').length || 0,
        emails: data?.filter(i => i.type === 'email').length || 0,
        tasks: data?.filter(i => i.is_task).length || 0,
        pendingTasks: data?.filter(i => i.is_task && i.task_status === 'pending').length || 0,
      };

      return stats;
    },
    enabled: !!user,
  });
}

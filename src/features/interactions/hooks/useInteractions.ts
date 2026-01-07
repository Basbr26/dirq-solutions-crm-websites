import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Interaction {
  id: string;
  company_id: string;
  contact_id: string | null;
  lead_id: string | null;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'demo';
  direction: 'inbound' | 'outbound' | null;
  subject: string;
  description: string | null;
  duration_minutes: number | null;
  scheduled_at: string | null;
  completed_at: string | null;
  is_task: boolean;
  task_status: 'pending' | 'completed' | 'cancelled' | null;
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
    full_name: string;
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
  isTask?: boolean;
  taskStatus?: string;
}

export interface CreateInteractionData {
  company_id: string;
  contact_id?: string;
  lead_id?: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'demo';
  direction?: 'inbound' | 'outbound';
  subject: string;
  description?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  is_task?: boolean;
  task_status?: 'pending' | 'completed' | 'cancelled';
  due_date?: string;
  tags?: string[];
}

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
          user:profiles!interactions_user_id_fkey(id, full_name)
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
      return interaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      toast.success('Interactie succesvol aangemaakt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij aanmaken interactie: ${error.message}`);
    },
  });
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient();

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
      toast.success('Interactie bijgewerkt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij bijwerken: ${error.message}`);
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      toast.success('Interactie verwijderd');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij verwijderen: ${error.message}`);
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

/**
 * Projects Query Hooks
 * React Query hooks for fetching projects data with advanced filtering
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePagination } from '@/hooks/usePagination';
import type { Project, ProjectFilters, AdvancedProjectFilters, PipelineStats, ProjectStage } from '@/types/projects';

/**
 * Fetch projects with advanced multi-dimensional filtering
 * Supports: multiple stages, value ranges, date ranges, multiple owners, etc.
 * @param filters - Advanced filter object
 */
export function useProjects(filters?: AdvancedProjectFilters) {
  const pagination = usePagination({ initialPageSize: 25 });

  const query = useQuery({
    queryKey: ['projects', filters, pagination.page, pagination.pageSize],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          companies!projects_company_id_fkey (id, name),
          contacts!projects_contact_id_fkey (id, first_name, last_name),
          profiles!projects_owner_id_fkey (id, first_name, last_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Basic filters (backward compatible)
      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }
      if (filters?.project_type) {
        query = query.eq('project_type', filters.project_type);
      }
      if (filters?.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }
      if (filters?.company_id) {
        query = query.eq('company_id', filters.company_id);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // =============================================
      // ADVANCED FILTERS - Multi-dimensional
      // =============================================

      // Multiple stages at once (e.g., negotiation + quote_sent)
      if (filters?.stages && filters.stages.length > 0) {
        query = query.in('stage', filters.stages);
      }

      // Value range filtering (min/max deal value)
      if (filters?.value_min !== undefined) {
        query = query.gte('value', filters.value_min);
      }
      if (filters?.value_max !== undefined) {
        query = query.lte('value', filters.value_max);
      }

      // Date range filtering (created_at)
      if (filters?.created_after) {
        query = query.gte('created_at', filters.created_after);
      }
      if (filters?.created_before) {
        query = query.lte('created_at', filters.created_before);
      }

      // Expected close date filtering
      if (filters?.expected_close_after) {
        query = query.gte('expected_close_date', filters.expected_close_after);
      }
      if (filters?.expected_close_before) {
        query = query.lte('expected_close_date', filters.expected_close_before);
      }

      // Probability range (useful for filtering high-confidence deals)
      if (filters?.probability_min !== undefined) {
        query = query.gte('probability', filters.probability_min);
      }
      if (filters?.probability_max !== undefined) {
        query = query.lte('probability', filters.probability_max);
      }

      // Multiple project types
      if (filters?.project_types && filters.project_types.length > 0) {
        query = query.in('project_type', filters.project_types);
      }

      // Multiple owners (useful for team views)
      if (filters?.owner_ids && filters.owner_ids.length > 0) {
        query = query.in('owner_id', filters.owner_ids);
      }

      // Pagination
      query = query.range(pagination.offset, pagination.offset + pagination.pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      
      return {
        projects: data as Project[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pagination.pageSize),
      };
    },
  });

  return {
    projects: query.data?.projects || [],
    totalCount: query.data?.totalCount || 0,
    totalPages: query.data?.totalPages || 0,
    isLoading: query.isLoading,
    error: query.error,
    pagination,
  };
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          companies!projects_company_id_fkey (id, name, email, phone, website),
          contacts!projects_contact_id_fkey (id, first_name, last_name, email, phone, position),
          profiles!projects_owner_id_fkey (id, first_name, last_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function usePipelineStats() {
  return useQuery({
    queryKey: ['pipeline-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('stage, value, probability')
        .neq('stage', 'lost');

      if (error) throw error;

      const stats: PipelineStats = {
        total_projects: data.length,
        total_value: data.reduce((sum, p) => sum + (p.value || 0), 0),
        weighted_value: data.reduce((sum, p) => sum + ((p.value || 0) * (p.probability || 0) / 100), 0),
        avg_deal_size: data.length > 0 ? data.reduce((sum, p) => sum + (p.value || 0), 0) / data.length : 0,
        by_stage: {} as Record<ProjectStage, { count: number; value: number }>,
      };

      // Group by stage
      const stages: ProjectStage[] = [
        'lead', 'quote_requested', 'quote_sent', 'negotiation', 'quote_signed',
        'in_development', 'review', 'live', 'maintenance', 'lost'
      ];

      stages.forEach(stage => {
        const stageProjects = data.filter(p => p.stage === stage);
        stats.by_stage[stage] = {
          count: stageProjects.length,
          value: stageProjects.reduce((sum, p) => sum + (p.value || 0), 0),
        };
      });

      return stats;
    },
  });
}

export function useProjectsByStage() {
  return useQuery({
    queryKey: ['projects-by-stage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          companies!projects_company_id_fkey (id, name),
          contacts!projects_contact_id_fkey (id, first_name, last_name)
        `)
        .neq('stage', 'lost')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by stage
      const grouped: Record<ProjectStage, Project[]> = {
        lead: [],
        quote_requested: [],
        quote_sent: [],
        negotiation: [],
        quote_signed: [],
        in_development: [],
        review: [],
        live: [],
        maintenance: [],
        lost: [],
      };

      data.forEach(project => {
        if (grouped[project.stage as ProjectStage]) {
          grouped[project.stage as ProjectStage].push(project as Project);
        }
      });

      return grouped;
    },
  });
}

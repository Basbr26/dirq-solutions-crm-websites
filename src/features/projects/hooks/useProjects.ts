/**
 * Projects Query Hooks
 * React Query hooks for fetching projects data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Project, ProjectFilters, PipelineStats, ProjectStage } from '@/types/projects';

export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          companies!company_id (id, name),
          contacts!contact_id (id, first_name, last_name),
          profiles!owner_id (id, full_name)
        `)
        .order('created_at', { ascending: false });

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

      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          companies!company_id (id, name, email, phone, website),
          contacts!contact_id (id, first_name, last_name, email, phone, position),
          profiles!owner_id (id, full_name, email)
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
          companies!company_id (id, name),
          contacts!contact_id (id, first_name, last_name)
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

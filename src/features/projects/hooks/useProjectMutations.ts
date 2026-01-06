/**
 * Project Mutations
 * Create, update, delete operations for projects
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CreateProjectInput, UpdateProjectInput, ProjectStage } from '@/types/projects';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...input,
          owner_id: user.id,
          stage: 'lead',
          probability: 10,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['executive-dashboard'] });
      toast.success('Project aangemaakt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij aanmaken project: ${error.message}`);
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const { data, error } = await supabase
        .from('projects')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['executive-dashboard'] });
      toast.success('Project bijgewerkt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij bijwerken project: ${error.message}`);
    },
  });
}

export function useUpdateProjectStage(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stage: ProjectStage) => {
      // Update probability based on stage
      const probabilityMap: Record<ProjectStage, number> = {
        lead: 10,
        quote_requested: 20,
        quote_sent: 40,
        negotiation: 60,
        quote_signed: 90,
        in_development: 95,
        review: 98,
        live: 100,
        maintenance: 100,
        lost: 0,
      };

      const { data, error } = await supabase
        .from('projects')
        .update({ 
          stage,
          probability: probabilityMap[stage],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['executive-dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(`Fout bij stage wijziging: ${error.message}`);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['executive-dashboard'] });
      toast.success('Project verwijderd');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij verwijderen project: ${error.message}`);
    },
  });
}

export function useProjectMutations(id?: string) {
  const create = useCreateProject();
  const update = useUpdateProject(id || '');
  const updateStage = useUpdateProjectStage(id || '');
  const deleteProject = useDeleteProject();
  
  return {
    create,
    update: id ? update : null,
    updateStage: id ? updateStage : null,
    delete: deleteProject,
  };
}

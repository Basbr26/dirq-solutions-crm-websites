/**
 * Project Mutations
 * Create, update, delete operations for projects
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CreateProjectInput, UpdateProjectInput, ProjectStage } from '@/types/projects';
import { notifyDealClosed, notifyProjectStageChanged, createDealWonNotification } from '@/lib/crmNotifications';
import { haptics } from '@/lib/haptics';

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
      haptics.success();
      toast.success('Project aangemaakt');
    },
    onError: (error: Error) => {
      haptics.error();
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
    onSuccess: async (project, newStage) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['executive-dashboard'] });

      // Notify on deal won/lost
      if (newStage === 'live' || newStage === 'lost') {
        const status = newStage === 'live' ? 'won' : 'lost';
        await notifyDealClosed(
          id,
          project.owner_id,
          project.title,
          status,
          project.value || 0
        );
      }

      // Notify on general stage change
      // Get previous stage from cache or database
      const cachedProject = queryClient.getQueryData(['projects', id]) as any;
      if (cachedProject && cachedProject.stage !== newStage) {
        await notifyProjectStageChanged(
          id,
          project.owner_id,
          project.title,
          cachedProject.stage,
          newStage
        );
      }
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

/**
 * Convert Lead to Customer
 * This mutation handles the complete conversion flow:
 * 1. Updates company status to 'customer'
 * 2. Updates project stage to 'quote_signed'
 * 3. Creates 'deal_won' notification
 * 4. Invalidates all relevant queries
 */
export function useConvertLeadToCustomer(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Fetch project to get company_id and owner_id
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*, companies!projects_company_id_fkey(id, name, status)')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      if (!project) throw new Error('Project niet gevonden');

      // Check if company is already a customer
      const isAlreadyCustomer = project.companies?.status === 'customer';

      // Transaction-like operations (sequential for safety)
      // 1. Update company status to 'customer'
      if (!isAlreadyCustomer) {
        const { error: companyError } = await supabase
          .from('companies')
          .update({ status: 'customer' })
          .eq('id', project.company_id);

        if (companyError) throw companyError;
      }

      // 2. Update project stage to 'quote_signed' with probability 90%
      const { error: stageError } = await supabase
        .from('projects')
        .update({ 
          stage: 'quote_signed',
          probability: 90,
        })
        .eq('id', projectId);

      if (stageError) throw stageError;

      // 3. Create 'deal_won' notification
      if (project.owner_id) {
        await createDealWonNotification(
          projectId,
          project.owner_id,
          project.title,
          project.value || 0,
          project.companies?.name || 'Onbekend bedrijf'
        );
      }

      return { project, wasAlreadyCustomer: isAlreadyCustomer };
    },
    onSuccess: ({ project, wasAlreadyCustomer }) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', project.company_id] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects-by-stage'] });
      queryClient.invalidateQueries({ queryKey: ['executive-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Success toast with context
      if (wasAlreadyCustomer) {
        toast.success('🎉 Project omgezet naar "Offerte Getekend"!', {
          description: `${project.title} is nu in development fase.`,
        });
      } else {
        toast.success('🎉 Lead succesvol omgezet naar klant!', {
          description: `${project.companies?.name} is nu een actieve klant met project "${project.title}".`,
        });
      }
    },
    onError: (error: Error) => {
      console.error('Conversion error:', error);
      toast.error('Fout bij conversie', {
        description: error.message,
      });
    },
  });
}

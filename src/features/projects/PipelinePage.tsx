/**
 * Pipeline Page - Kanban Board View
 * Visual pipeline for website development projects
 */

import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, DollarSign } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectsByStage, usePipelineStats } from './hooks/useProjects';
import { useCreateProject } from './hooks/useProjectMutations';
import { ProjectForm } from './components/ProjectForm';
import { supabase } from '@/integrations/supabase/client';
import { projectStageConfig, type ProjectStage, type Project } from '@/types/projects';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const activeStages: ProjectStage[] = [
  'lead',
  'quote_requested',
  'quote_sent',
  'negotiation',
  'quote_signed',
  'in_development',
  'review',
  'live',
];

export default function PipelinePage() {
  const { data: projectsByStage, isLoading } = useProjectsByStage();
  const { data: stats } = usePipelineStats();
  const queryClient = useQueryClient();
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const createProject = useCreateProject();

  const formatCurrency = useMemo(
    () => (amount: number) =>
      new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(amount),
    []
  );

  const handleDragStart = (project: Project) => {
    setDraggedProject(project);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = useCallback(async (stage: ProjectStage) => {
    if (!draggedProject || draggedProject.stage === stage) {
      setDraggedProject(null);
      return;
    }

    // Probability map for stage updates
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

    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          stage,
          probability: probabilityMap[stage],
        })
        .eq('id', draggedProject.id);

      if (error) throw error;

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });

      toast.success('Project fase bijgewerkt');
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast.error('Fout bij bijwerken project fase');
    } finally {
      setDraggedProject(null);
    }
  }, [draggedProject, queryClient]);

  return (
    <AppLayout
      title="Sales Pipeline"
      subtitle="Website development projecten en deals"
      actions={
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuw Project
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Pipeline Waarde
              </div>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_value)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Gewogen Waarde</div>
              <div className="text-2xl font-bold">{formatCurrency(stats.weighted_value)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Actieve Projecten</div>
              <div className="text-2xl font-bold">{stats.total_projects}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Gem. Deal Size
              </div>
              <div className="text-2xl font-bold">{formatCurrency(stats.avg_deal_size)}</div>
            </Card>
          </div>
        )}

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {isLoading ? (
            <div className="flex gap-4">
              {activeStages.map(stage => (
                <div key={stage} className="w-80 flex-shrink-0">
                  <Card className="p-4 animate-pulse">
                    <div className="h-6 bg-muted rounded w-1/2 mb-4" />
                    <div className="space-y-2">
                      {[1, 2].map(i => (
                        <div key={i} className="h-24 bg-muted rounded" />
                      ))}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            activeStages.map(stage => {
              const config = projectStageConfig[stage];
              const projects = projectsByStage?.[stage] || [];
              const stageValue = projects.reduce((sum, p) => sum + (p.value || 0), 0);

              return (
                <div
                  key={stage}
                  className="w-80 flex-shrink-0"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage)}
                >
                  <Card 
                    className="h-full flex flex-col"
                    style={{ borderTopColor: config.color, borderTopWidth: 3 }}
                  >
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{config.icon}</span>
                          <h3 className="font-semibold">{config.label}</h3>
                        </div>
                        <Badge variant="secondary">{projects.length}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(stageValue)}
                      </div>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-3">
                        {projects.length === 0 ? (
                          <div className="text-center py-8 text-sm text-muted-foreground">
                            Geen projecten
                          </div>
                        ) : (
                          projects.map(project => (
                            <Link
                              key={project.id}
                              to={`/projects/${project.id}`}
                              draggable
                              onDragStart={() => handleDragStart(project)}
                              className="block"
                            >
                              <Card className="p-3 hover:shadow-md transition-shadow cursor-move">
                                <h4 className="font-medium mb-1 line-clamp-2">
                                  {project.title}
                                </h4>
                                <div className="text-sm text-muted-foreground mb-2">
                                  {project.companies?.name}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-green-600">
                                    {formatCurrency(project.value || 0)}
                                  </span>
                                  {project.expected_close_date && (
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(project.expected_close_date), 'dd MMM', { locale: nl })}
                                    </span>
                                  )}
                                </div>
                              </Card>
                            </Link>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      <ProjectForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(data) => {
          createProject.mutate(data, {
            onSuccess: () => {
              setCreateDialogOpen(false);
              toast.success('Project aangemaakt');
            },
            onError: (error) => {
              toast.error(`Fout bij aanmaken: ${error.message}`);
            },
          });
        }}
        isLoading={createProject.isPending}
      />
    </AppLayout>
  );
}

/**
 * Pipeline Page - Kanban Board View (Redesigned)
 * Clean, sectioned pipeline for website development projects
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, DollarSign, MoreVertical, Target, Briefcase, Code } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useProjectsByStage, usePipelineStats } from './hooks/useProjects';
import { useCreateProject } from './hooks/useProjectMutations';
import { ProjectForm } from './components/ProjectForm';
import { supabase } from '@/integrations/supabase/client';
import { type ProjectStage, type Project } from '@/types/projects';
import { useProjectStageConfig } from '@/types/projectStageConfig';
import { getPipelineSections } from '@/config/pipeline';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

export default function PipelinePage() {
  const { t } = useTranslation();
  const projectStageConfig = useProjectStageConfig();
  const PIPELINE_SECTIONS = useMemo(() => getPipelineSections(t), [t]);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const { data: projectsByStage, isLoading } = useProjectsByStage();
  const { data: stats } = usePipelineStats();
  const queryClient = useQueryClient();
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [focusedStage, setFocusedStage] = useState<ProjectStage | null>(null);
  
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

  const handleDragStart = useCallback((project: Project) => {
    setDraggedProject(project);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

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
      await queryClient.invalidateQueries({ queryKey: ['projects-by-stage'] });
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });

      // Show toast with project name and company
      const projectName = draggedProject.title || 'Project';
      const companyName = draggedProject.companies?.name || 'Onbekend bedrijf';
      
      toast.success(`${projectName} (${companyName}) verplaatst naar ${projectStageConfig[stage].label}`);
    } catch (error) {
      logger.error(error, { context: 'pipeline_drag_drop', project_id: draggedProject?.id, target_stage: stage });
      toast.error(t('errors.updateProjectStageFailed'));
    } finally {
      setDraggedProject(null);
    }
  }, [draggedProject, queryClient, t, projectStageConfig]);

  // For mobile: move project to stage using dropdown
  const handleMoveToStage = useCallback(async (project: Project, newStage: ProjectStage) => {
    if (project.stage === newStage) return;

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
          stage: newStage,
          probability: probabilityMap[newStage],
        })
        .eq('id', project.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['projects-by-stage'] });
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });

      // Show toast with project name and company
      const projectName = project.title || 'Project';
      const companyName = project.companies?.name || 'Onbekend bedrijf';
      
      toast.success(`${projectName} (${companyName}) verplaatst naar ${projectStageConfig[newStage].label}`);
    } catch (error) {
      logger.error(error, { context: 'pipeline_move_project', project_id: project.id, target_stage: newStage });
      toast.error(t('errors.moveProjectFailed'));
    }
  }, [queryClient, t, projectStageConfig]);

  // Render a pipeline section
  const renderPipelineSection = (
    sectionKey: keyof typeof PIPELINE_SECTIONS,
    stages: ProjectStage[]
  ) => {
    const section = PIPELINE_SECTIONS[sectionKey];
    
    return (
      <div key={sectionKey} className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="text-sm text-muted-foreground">{section.subtitle}</p>
          </div>
        </div>

        {/* Stages Grid */}
        <div 
          className={isMobile ? "flex gap-3 overflow-x-auto pb-4" : "grid gap-4"}
          style={isMobile ? {
            scrollSnapType: 'x mandatory',
            scrollPadding: '0 16px',
            WebkitOverflowScrolling: 'touch',
          } : {
            gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
          }}
        >
          {stages.map((stage, index) => {
            const config = projectStageConfig[stage];
            const projects = projectsByStage?.[stage] || [];
            const stageValue = projects.reduce((sum, p) => sum + (p.value || 0), 0);
            const isFocused = focusedStage === stage;

            return (
              <div
                key={stage}
                className={isMobile ? "flex-shrink-0" : "relative"}
                style={isMobile ? {
                  width: '85vw',
                  scrollSnapAlign: 'center',
                } : undefined}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage)}
                onClick={() => setFocusedStage(isFocused ? null : stage)}
              >
                <Card 
                  className={`h-full flex flex-col transition-shadow duration-200 cursor-pointer
                    ${isFocused ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}
                >
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <config.icon className={`h-5 w-5 ${config.colorClass}`} />
                        <h3 className="font-semibold text-sm">{config.label}</h3>
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        {projects.length}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {formatCurrency(stageValue)}
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-2">
                      {projects.length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                          <config.icon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <div>{t('projects.noProjects')}</div>
                        </div>
                      ) : (
                        projects.map(project => (
                          <div key={project.id} className="relative group">
                            <Link
                              to={`/projects/${project.id}`}
                              draggable={!isMobile}
                              onDragStart={() => handleDragStart(project)}
                              className="block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Card className={`p-3 transition-shadow duration-150
                                ${isMobile ? 'active:opacity-90' : 'hover:shadow-md cursor-move'}`}>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="font-medium text-sm line-clamp-2 flex-1">
                                    {project.title}
                                  </h4>
                                  {isMobile && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger 
                                        asChild 
                                        onClick={(e) => e.preventDefault()}
                                      >
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="min-h-[44px] min-w-[44px] p-0 flex-shrink-0"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuLabel>{t('projects.moveTo')}</DropdownMenuLabel>
                                        {[...PIPELINE_SECTIONS.sales.stages, ...PIPELINE_SECTIONS.development.stages]
                                          .filter(s => s !== project.stage)
                                          .map(targetStage => {
                                            const config = projectStageConfig[targetStage];
                                            const TargetIcon = config.icon;
                                            return (
                                              <DropdownMenuItem
                                                key={targetStage}
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  handleMoveToStage(project, targetStage);
                                                }}
                                              >
                                                <TargetIcon className={`mr-2 h-4 w-4 ${config.colorClass}`} />
                                                {config.label}
                                              </DropdownMenuItem>
                                            );
                                          })}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mb-2 truncate">
                                  {project.companies?.name}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-primary text-sm">
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
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AppLayout
      title={t('pipeline.title')}
      subtitle={t('pipeline.subtitle')}
      actions={
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('projects.newProject')}
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-8">
        {/* Stats Cards - Identical to Dashboard KPI cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
                  {t('pipeline.stats.totalValue')}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(stats.total_value)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                  {t('pipeline.stats.totalValueDescription')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
                  {t('pipeline.stats.weightedValue')}
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(stats.weighted_value)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                  {t('pipeline.stats.weightedValueDescription')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
                  {t('pipeline.stats.activeProjects')}
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold truncate">{stats.total_projects}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                  {t('pipeline.stats.avgDealSize')}: {formatCurrency(stats.avg_deal_size)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-8">
            {Object.keys(PIPELINE_SECTIONS).map(section => (
              <div key={section} className="space-y-4">
                <div className="h-8 bg-slate-100 rounded w-64 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="p-4 animate-pulse h-64">
                      <div className="h-6 bg-slate-100 rounded w-1/2 mb-4" />
                      <div className="space-y-2">
                        <div className="h-20 bg-slate-100 rounded" />
                        <div className="h-20 bg-slate-100 rounded" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Sales Pipeline Section */}
            {renderPipelineSection('sales', PIPELINE_SECTIONS.sales.stages)}
            
            {/* Development Pipeline Section */}
            {renderPipelineSection('development', PIPELINE_SECTIONS.development.stages)}
          </>
        )}
      </div>

      {/* Create Project Dialog */}
      <ProjectForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(data) => {
          createProject.mutate(data, {
            onSuccess: () => {
              setCreateDialogOpen(false);
              toast.success(t('success.projectCreated'));
            },
            onError: (error) => {
              toast.error(t('errors.createProjectFailed', { message: error.message }));
            },
          });
        }}
        isLoading={createProject.isPending}
      />
    </AppLayout>
  );
}

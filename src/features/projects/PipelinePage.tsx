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
import { Card } from '@/components/ui/card';
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
import { projectStageConfig, type ProjectStage, type Project } from '@/types/projects';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function PipelinePage() {
  const { t } = useTranslation();
  
  // Pipeline sections with translations
  const PIPELINE_SECTIONS = {
    sales: {
      title: `💼 ${t('pipeline.salesPipeline')}`,
      subtitle: t('pipeline.salesSubtitle'),
      stages: ['lead', 'quote_requested', 'quote_sent', 'negotiation', 'quote_signed'] as ProjectStage[],
    },
    development: {
      title: `⚙️ ${t('pipeline.devPipeline')}`,
      subtitle: t('pipeline.devSubtitle'),
      stages: ['in_development', 'review', 'live'] as ProjectStage[],
    },
  };
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

      // Show toast with project name and company
      const projectName = draggedProject.title || 'Project';
      const companyName = draggedProject.companies?.name || draggedProject.profiles?.voornaam 
        ? `${draggedProject.profiles?.voornaam} ${draggedProject.profiles?.achternaam}`.trim()
        : 'Onbekend';
      
      toast.success(`${projectName} (${companyName}) verplaatst naar ${projectStageConfig[stage].label}`);
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast.error(t('errors.updateProjectStageFailed'));
    } finally {
      setDraggedProject(null);
    }
  }, [draggedProject, queryClient, t]);

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

      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });

      // Show toast with project name and company
      const projectName = project.title || 'Project';
      const companyName = project.companies?.name || project.profiles?.voornaam
        ? `${project.profiles?.voornaam} ${project.profiles?.achternaam}`.trim()
        : 'Onbekend';
      
      toast.success(`${projectName} (${companyName}) verplaatst naar ${projectStageConfig[newStage].label}`);
    } catch (error) {
      console.error('Failed to move project:', error);
      toast.error(t('errors.moveProjectFailed'));
    }
  }, [queryClient, t]);

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
          {/* Flow indicator line (desktop only) */}
          {!isTablet && stages.length > 1 && (
            <div className="absolute top-12 left-8 right-8 h-0.5 bg-gradient-to-r from-slate-200 via-primary/10 to-slate-200 z-0" 
              style={{ pointerEvents: 'none' }} 
            />
          )}

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
                  className={`h-full flex flex-col transition-all duration-200 cursor-pointer
                    ${isFocused ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}
                    bg-white border-l-4`}
                  style={{ borderLeftColor: config.color }}
                >
                  <div className="p-4 border-b bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{config.icon}</span>
                        <h3 className="font-semibold text-sm">{config.label}</h3>
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        {projects.length}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {formatCurrency(stageValue)}
                    </div>
                    
                    {/* Flow arrow (desktop only, not on last stage) */}
                    {!isTablet && index < stages.length - 1 && (
                      <div className="absolute top-12 -right-4 text-slate-300 text-2xl z-10">
                        →
                      </div>
                    )}
                  </div>

                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-2">
                      {projects.length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                          <div className="text-3xl mb-2 opacity-20">{config.icon}</div>
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
                              <Card className={`p-3 transition-all duration-150
                                ${isMobile ? 'active:scale-[0.98]' : 'hover:shadow-md hover:scale-[1.02] cursor-move'}
                                bg-white border border-slate-200`}>
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
                                          className="h-7 w-7 p-0 flex-shrink-0"
                                        >
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuLabel>{t('projects.moveTo')}</DropdownMenuLabel>
                                        {[...PIPELINE_SECTIONS.sales.stages, ...PIPELINE_SECTIONS.development.stages]
                                          .filter(s => s !== project.stage)
                                          .map(targetStage => {
                                            const config = projectStageConfig[targetStage];
                                            return (
                                              <DropdownMenuItem
                                                key={targetStage}
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  handleMoveToStage(project, targetStage);
                                                }}
                                              >
                                                <span className="mr-2">{config.icon}</span>
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
        {/* Enhanced Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 border-l-4 border-l-primary">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {t('pipeline.stats.totalValue')}
                </div>
              </div>
              <div className="text-3xl font-bold">{formatCurrency(stats.total_value)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {t('pipeline.stats.totalValueDescription')}
              </div>
            </Card>
            
            <Card className="p-6 border-l-4 border-l-green-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {t('pipeline.stats.weightedValue')}
                </div>
              </div>
              <div className="text-3xl font-bold">{formatCurrency(stats.weighted_value)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {t('pipeline.stats.weightedValueDescription')}
              </div>
            </Card>
            
            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {t('pipeline.stats.activeProjects')}
                </div>
              </div>
              <div className="text-3xl font-bold">{stats.total_projects}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {t('pipeline.stats.avgDealSize')}: {formatCurrency(stats.avg_deal_size)}
              </div>
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

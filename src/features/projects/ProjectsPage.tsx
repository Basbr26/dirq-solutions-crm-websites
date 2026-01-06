/**
 * Projects Page - List View
 * Overview of all projects with filtering and search
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, FolderKanban, TrendingUp, Euro, BarChart3 } from 'lucide-react';
import { useProjects, usePipelineStats } from './hooks/useProjects';
import { useCreateProject } from './hooks/useProjectMutations';
import { ProjectForm } from './components/ProjectForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { projectStageConfig, type ProjectStage, type ProjectType } from '@/types/projects';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';

const projectTypeLabels: Record<ProjectType, string> = {
  landing_page: 'Landing Page',
  portfolio: 'Portfolio',
  ecommerce: 'E-commerce',
  blog: 'Blog',
  custom: 'Custom',
  corporate_website: 'Corporate Website',
  web_app: 'Web App',
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<ProjectStage | ''>('');
  const [typeFilter, setTypeFilter] = useState<ProjectType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const createProject = useCreateProject();

  const { data: projects, isLoading } = useProjects({
    search: search || undefined,
    stage: stageFilter || undefined,
    project_type: typeFilter || undefined,
  });

  const { data: stats } = usePipelineStats();

  const canCreateProject = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projecten</h1>
          <p className="text-muted-foreground">
            Overzicht van alle website ontwikkel projecten
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/pipeline')}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Pipeline View
          </Button>
          {canCreateProject && (
            <Button size="lg" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuw Project
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_projects}</div>
              <p className="text-xs text-muted-foreground">actieve projecten</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Waarde</CardTitle>
              <Euro className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(stats.total_value)}
              </div>
              <p className="text-xs text-muted-foreground">totale waarde</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gewogen Waarde</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {formatCurrency(stats.weighted_value)}
              </div>
              <p className="text-xs text-muted-foreground">op basis van probability</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gem. Deal Size</CardTitle>
              <Euro className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">
                {formatCurrency(stats.avg_deal_size)}
              </div>
              <p className="text-xs text-muted-foreground">per project</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek projecten..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {(stageFilter || typeFilter) && (
              <Badge variant="secondary" className="ml-1">
                {[stageFilter, typeFilter].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fase</label>
                <Select 
                  value={stageFilter} 
                  onValueChange={(value) => setStageFilter(value as ProjectStage | '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alle fases" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle fases</SelectItem>
                    {Object.entries(projectStageConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.icon} {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Type</label>
                <Select 
                  value={typeFilter} 
                  onValueChange={(value) => setTypeFilter(value as ProjectType | '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alle types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle types</SelectItem>
                    {Object.entries(projectTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStageFilter('');
                  setTypeFilter('');
                }}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-64" />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const stageConfig = projectStageConfig[project.stage];
            return (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-1">
                        {project.title}
                      </CardTitle>
                      {project.companies && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {project.companies.name}
                        </p>
                      )}
                    </div>
                    <Badge
                      className={`${stageConfig.color} text-white whitespace-nowrap`}
                    >
                      {stageConfig.icon} {stageConfig.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      {project.value && (
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-semibold">
                            {formatCurrency(project.value)}
                          </span>
                        </div>
                      )}
                      {project.probability !== null && (
                        <div className="text-xs text-muted-foreground">
                          {project.probability}% kans
                        </div>
                      )}
                    </div>

                    {project.project_type && (
                      <Badge variant="outline">
                        {projectTypeLabels[project.project_type]}
                      </Badge>
                    )}
                  </div>

                  {project.expected_close_date && (
                    <div className="text-xs text-muted-foreground">
                      Verwacht: {format(new Date(project.expected_close_date), 'dd MMM yyyy', { locale: nl })}
                    </div>
                  )}

                  {project.profiles && (
                    <div className="text-xs text-muted-foreground">
                      Eigenaar: {project.profiles.full_name}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="font-semibold text-lg">Geen projecten gevonden</h3>
              <p className="text-sm text-muted-foreground">
                {search || stageFilter || typeFilter
                  ? 'Probeer andere filters of zoekterm'
                  : 'Begin met het toevoegen van je eerste project'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Project Dialog */}
      <ProjectForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(data) => {
          createProject.mutate(data, {
            onSuccess: () => {
              setCreateDialogOpen(false);
            },
          });
        }}
        isLoading={createProject.isPending}
      />
    </div>
    </AppLayout>
  );
}

/**
 * Example: ProjectsPage with Advanced Filtering
 * This shows how to integrate AdvancedFilterPopover with URL sync
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FolderKanban, TrendingUp, Euro, BarChart3 } from 'lucide-react';
import { useProjects, usePipelineStats } from './hooks/useProjects';
import { useCreateProject } from './hooks/useProjectMutations';
import { ProjectForm } from './components/ProjectForm';
import { useDebounce } from '@/hooks/useDebounce';
import { useProjectFilterParams } from '@/hooks/useFilterParams';
import { AdvancedFilterPopover } from '@/components/AdvancedFilterPopover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { projectStageConfig } from '@/types/projects';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';

export default function ProjectsPageWithAdvancedFilters() {
  const navigate = useNavigate();
  const { role } = useAuth();
  
  // URL parameter synchronization
  const { filters, updateFilters, clearFilters } = useProjectFilterParams();
  
  // Debounce search separately
  const debouncedSearch = useDebounce(filters.search || '', 500);

  // Merge debounced search with other filters
  const activeFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined,
  }), [filters, debouncedSearch]);

  const { projects, isLoading } = useProjects(activeFilters);
  const { data: stats } = usePipelineStats();

  const canCreateProject = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);

  const handleSearchChange = (value: string) => {
    updateFilters({
      ...filters,
      search: value || undefined,
    });
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    updateFilters(newFilters);
  };

  const activeFilterCount = [
    filters.stages && filters.stages.length > 0,
    filters.value_min !== undefined,
    filters.value_max !== undefined,
    filters.created_after,
    filters.created_before,
    filters.probability_min !== undefined,
    filters.probability_max !== undefined,
  ].filter(Boolean).length;

  return (
    <AppLayout
      title="Projecten"
      subtitle={format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}
      actions={
        <div className="flex items-center gap-2">
          {/* Advanced Filter Popover */}
          <AdvancedFilterPopover
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={clearFilters}
          />
          
          {canCreateProject && (
            <Button onClick={() => navigate('/projects/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuw Project
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal Projecten</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.total_projects || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Waarde</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{((stats?.total_value || 0) / 1000).toFixed(0)}k
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gewogen Waarde</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{((stats?.weighted_value || 0) / 1000).toFixed(0)}k
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gem. Deal Size</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{((stats?.avg_deal_size || 0) / 1000).toFixed(0)}k
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoek projecten..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Actieve filters:</span>
            
            {filters.stages && filters.stages.length > 0 && (
              <Badge variant="secondary">
                {filters.stages.length} stage(s)
              </Badge>
            )}
            
            {(filters.value_min !== undefined || filters.value_max !== undefined) && (
              <Badge variant="secondary">
                {filters.value_min !== undefined && `€${filters.value_min}+`}
                {filters.value_min !== undefined && filters.value_max !== undefined && ' - '}
                {filters.value_max !== undefined && `€${filters.value_max}`}
              </Badge>
            )}
            
            {filters.created_after && (
              <Badge variant="secondary">
                Vanaf {format(new Date(filters.created_after), 'dd MMM yyyy', { locale: nl })}
              </Badge>
            )}
            
            {(filters.probability_min !== undefined || filters.probability_max !== undefined) && (
              <Badge variant="secondary">
                Kans: {filters.probability_min || 0}%-{filters.probability_max || 100}%
              </Badge>
            )}
          </div>
        )}

        {/* Projects List */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : projects && projects.length > 0 ? (
            projects.map((project: any) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{project.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.companies?.name}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${projectStageConfig[project.stage as keyof typeof projectStageConfig]?.color}20`,
                        borderColor: projectStageConfig[project.stage as keyof typeof projectStageConfig]?.color,
                        color: projectStageConfig[project.stage as keyof typeof projectStageConfig]?.color,
                      }}
                    >
                      {projectStageConfig[project.stage as keyof typeof projectStageConfig]?.label}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    {project.value && (
                      <span>€{project.value.toLocaleString('nl-NL')}</span>
                    )}
                    <span>{project.probability}% kans</span>
                    <span>
                      {format(new Date(project.created_at), 'dd MMM yyyy', { locale: nl })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Geen projecten gevonden</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeFilterCount > 0
                    ? 'Probeer je filters aan te passen'
                    : 'Er zijn nog geen projecten aangemaakt'}
                </p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" onClick={clearFilters}>
                    Wis filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

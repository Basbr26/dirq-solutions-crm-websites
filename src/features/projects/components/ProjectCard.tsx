import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Project } from '@/types/projects';
import { useProjectStageConfig } from '@/types/projectStageConfig';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  Calendar,
  Euro,
  Package,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard = memo(function ProjectCard({ project }: ProjectCardProps) {
  const { t } = useTranslation();
  const projectStageConfig = useProjectStageConfig();
  
  const projectTypeLabels = (type: string) => {
    const labels = {
      landing_page: t('projects.types.landingPage'),
      corporate_website: t('projects.types.corporateWebsite'),
      ecommerce: t('projects.types.ecommerce'),
      web_app: t('projects.types.webApp'),
      blog: t('projects.types.blog'),
      portfolio: t('projects.types.portfolio'),
      custom: t('projects.types.custom'),
      ai_automation: t('projects.types.aiAutomation'),
    };
    return labels[type as keyof typeof labels] || labels.custom;
  };
  
  const stageConfig = projectStageConfig[project.stage];
  const StageIcon = stageConfig.icon;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate mb-1">{project.title}</h3>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <StageIcon className={`h-3 w-3 ${stageConfig.colorClass}`} />
              {stageConfig.label}
            </Badge>
          </div>

          {/* Project Type */}
          {project.project_type && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{projectTypeLabels(project.project_type)}</span>
            </div>
          )}

          {/* Value & Probability */}
          <div className="flex items-center justify-between text-sm">
            {project.value && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Euro className="h-4 w-4" />
                <span className="font-medium">
                  € {project.value.toLocaleString('nl-NL')}
                </span>
              </div>
            )}
            {project.probability !== undefined && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-600">
                  {project.probability}%
                </span>
              </div>
            )}
          </div>

          {/* Expected Close Date */}
          {project.expected_close_date && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {t('projects.expected')}: {format(new Date(project.expected_close_date), 'dd MMM yyyy', { locale: nl })}
              </span>
            </div>
          )}

          {/* Launch Date */}
          {project.launch_date && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {t('projects.launch')}: {format(new Date(project.launch_date), 'dd MMM yyyy', { locale: nl })}
              </span>
            </div>
          )}

          {/* Features Tags */}
          {project.features && project.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.features.slice(0, 3).map((feature, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
              {project.features.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{project.features.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

ProjectCard.displayName = 'ProjectCard';

import { Project } from '@/types/projects';
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

const stageConfig = {
  lead: { label: 'Lead', color: 'bg-blue-500/10 text-blue-500' },
  quote_requested: { label: 'Quote Aangevraagd', color: 'bg-purple-500/10 text-purple-500' },
  quote_sent: { label: 'Quote Verstuurd', color: 'bg-indigo-500/10 text-indigo-500' },
  negotiation: { label: 'Onderhandeling', color: 'bg-amber-500/10 text-amber-500' },
  quote_signed: { label: 'Quote Getekend', color: 'bg-green-500/10 text-green-500' },
  in_development: { label: 'In Ontwikkeling', color: 'bg-cyan-500/10 text-cyan-500' },
  review: { label: 'Review', color: 'bg-orange-500/10 text-orange-500' },
  live: { label: 'Live', color: 'bg-emerald-500/10 text-emerald-500' },
  maintenance: { label: 'Onderhoud', color: 'bg-slate-500/10 text-slate-500' },
  lost: { label: 'Verloren', color: 'bg-red-500/10 text-red-500' },
};

const projectTypeLabels = {
  landing_page: 'Landing Page',
  corporate_website: 'Bedrijfswebsite',
  ecommerce: 'E-commerce',
  web_app: 'Web Applicatie',
  blog: 'Blog',
  portfolio: 'Portfolio',
  custom: 'Op Maat',  ai_automation: 'AI Automatisering',};

export function ProjectCard({ project }: ProjectCardProps) {
  const stageStyle = stageConfig[project.stage];

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
            <Badge className={stageStyle.color} variant="secondary">
              {stageStyle.label}
            </Badge>
          </div>

          {/* Project Type */}
          {project.project_type && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{projectTypeLabels[project.project_type]}</span>
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
                Verwacht: {format(new Date(project.expected_close_date), 'dd MMM yyyy', { locale: nl })}
              </span>
            </div>
          )}

          {/* Launch Date */}
          {project.launch_date && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Launch: {format(new Date(project.launch_date), 'dd MMM yyyy', { locale: nl })}
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
}

import { useTranslation } from 'react-i18next';
import type { ProjectStage } from './projects';
import { 
  HandMetal,
  FileQuestion,
  Send,
  Handshake,
  CheckCircle,
  Code,
  Eye,
  Rocket,
  Settings,
  XCircle
} from 'lucide-react';

/**
 * Hook to get translated project stage configuration
 */
export function useProjectStageConfig() {
  const { t } = useTranslation();
  
  const projectStageConfig: Record<ProjectStage, { 
    label: string; 
    colorClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = {
    lead: { label: t('projects.stages.lead'), colorClass: 'text-muted-foreground', icon: HandMetal },
    quote_requested: { label: t('projects.stages.quote_requested'), colorClass: 'text-blue-600 dark:text-blue-400', icon: FileQuestion },
    quote_sent: { label: t('projects.stages.quote_sent'), colorClass: 'text-purple-600 dark:text-purple-400', icon: Send },
    negotiation: { label: t('projects.stages.negotiation'), colorClass: 'text-amber-600 dark:text-amber-400', icon: Handshake },
    quote_signed: { label: t('projects.stages.quote_signed'), colorClass: 'text-green-600 dark:text-green-400', icon: CheckCircle },
    in_development: { label: t('projects.stages.in_development'), colorClass: 'text-cyan-600 dark:text-cyan-400', icon: Code },
    review: { label: t('projects.stages.review'), colorClass: 'text-pink-600 dark:text-pink-400', icon: Eye },
    live: { label: t('projects.stages.live'), colorClass: 'text-emerald-600 dark:text-emerald-400', icon: Rocket },
    maintenance: { label: t('projects.stages.maintenance'), colorClass: 'text-muted-foreground', icon: Settings },
    lost: { label: t('projects.stages.lost'), colorClass: 'text-red-600 dark:text-red-400', icon: XCircle },
  };

  return projectStageConfig;
}

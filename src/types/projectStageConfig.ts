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
    lead: { label: t('projects.stages.lead'), colorClass: 'text-gray-500', icon: HandMetal },
    quote_requested: { label: t('projects.stages.quote_requested'), colorClass: 'text-blue-500', icon: FileQuestion },
    quote_sent: { label: t('projects.stages.quote_sent'), colorClass: 'text-purple-500', icon: Send },
    negotiation: { label: t('projects.stages.negotiation'), colorClass: 'text-amber-500', icon: Handshake },
    quote_signed: { label: t('projects.stages.quote_signed'), colorClass: 'text-green-500', icon: CheckCircle },
    in_development: { label: t('projects.stages.in_development'), colorClass: 'text-cyan-500', icon: Code },
    review: { label: t('projects.stages.review'), colorClass: 'text-pink-500', icon: Eye },
    live: { label: t('projects.stages.live'), colorClass: 'text-emerald-500', icon: Rocket },
    maintenance: { label: t('projects.stages.maintenance'), colorClass: 'text-teal-500', icon: Settings },
    lost: { label: t('projects.stages.lost'), colorClass: 'text-red-500', icon: XCircle },
  };

  return projectStageConfig;
}

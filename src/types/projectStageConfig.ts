import { useTranslation } from 'react-i18next';
import type { ProjectStage } from './projects';

/**
 * Hook to get translated project stage configuration
 */
export function useProjectStageConfig() {
  const { t } = useTranslation();
  
  const projectStageConfig: Record<ProjectStage, { 
    label: string; 
    color: string;
    icon: string;
  }> = {
    lead: { label: t('projects.stages.lead'), color: '#6B7280', icon: '👋' },
    quote_requested: { label: t('projects.stages.quote_requested'), color: '#3B82F6', icon: '📋' },
    quote_sent: { label: t('projects.stages.quote_sent'), color: '#8B5CF6', icon: '📨' },
    negotiation: { label: t('projects.stages.negotiation'), color: '#F59E0B', icon: '🤝' },
    quote_signed: { label: t('projects.stages.quote_signed'), color: '#10B981', icon: '✅' },
    in_development: { label: t('projects.stages.in_development'), color: '#06B6D4', icon: '🔨' },
    review: { label: t('projects.stages.review'), color: '#EC4899', icon: '👀' },
    live: { label: t('projects.stages.live'), color: '#22C55E', icon: '🚀' },
    maintenance: { label: t('projects.stages.maintenance'), color: '#14B8A6', icon: '🔧' },
    lost: { label: t('projects.stages.lost'), color: '#EF4444', icon: '❌' },
  };

  return projectStageConfig;
}

/**
 * Pipeline Configuration
 * Shared constants for pipeline stages and sections
 */

import type { ProjectStage } from '@/types/projects';

export interface PipelineSection {
  title: string;
  subtitle: string;
  stages: ProjectStage[];
}

/**
 * Get translated pipeline sections
 * @param t - i18n translation function
 */
export function getPipelineSections(t: (key: string) => string): Record<'sales' | 'development', PipelineSection> {
  return {
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
}

/**
 * All active project stages (excludes maintenance and lost)
 */
export const ACTIVE_PIPELINE_STAGES: ProjectStage[] = [
  'lead',
  'quote_requested',
  'quote_sent',
  'negotiation',
  'quote_signed',
  'in_development',
  'review',
  'live',
];

/**
 * Sales pipeline stages
 */
export const SALES_STAGES: ProjectStage[] = [
  'lead',
  'quote_requested',
  'quote_sent',
  'negotiation',
  'quote_signed',
];

/**
 * Development pipeline stages
 */
export const DEVELOPMENT_STAGES: ProjectStage[] = [
  'in_development',
  'review',
  'live',
];

import { logger } from '@/lib/logger';

const N8N_WEBHOOK_BASE = 'https://dirqsolutions.app.n8n.cloud/webhook';

type WebhookPayloads = {
  'company-created': { company_id: string };
  'milestone-reached': { project_id: string; milestone_name: string; milestone_percentage: number };
  'meeting-missed': { company_id: string; meeting_subject: string; meeting_date: string };
};

/**
 * Fire-and-forget webhook trigger naar n8n.
 * Blokkeert de UI nooit — fouten worden alleen gelogd.
 */
export function triggerWebhook<K extends keyof WebhookPayloads>(
  event: K,
  payload: WebhookPayloads[K]
): void {
  fetch(`${N8N_WEBHOOK_BASE}/${event}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => {
    logger.warn('n8n webhook trigger mislukt', { event, error: err?.message });
  });
}

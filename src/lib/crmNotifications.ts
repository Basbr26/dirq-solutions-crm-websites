/**
 * CRM Notifications Helper
 * Send notifications for CRM events
 */

import { supabase } from '@/integrations/supabase/client';
import { NotificationType } from '@/types/crm';
import { logger } from './logger';

interface NotificationData {
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: 'company' | 'contact' | 'lead' | 'quote' | 'project' | 'task';
  entity_id?: string;
  deep_link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export async function sendCRMNotification(data: NotificationData) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: data.recipient_id,
        type: data.type,
        priority: data.priority || 'normal',
        title: data.title,
        message: data.message,
        related_entity_type: data.entity_type,
        related_entity_id: data.entity_id,
        deep_link: data.deep_link,
        read_at: null,
        is_digest: false,
      }]);

    if (error) {
      logger.error(error, { context: 'Failed to send notification' });
      return false;
    }

    return true;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'Error sending CRM notification' });
    return false;
  }
}

// Helper: Notify when quote status changes
export async function notifyQuoteStatusChange(
  quoteId: string,
  status: 'accepted' | 'rejected',
  createdBy: string,
  companyName: string,
  quoteTitle: string
) {
  const type: NotificationType = status === 'accepted' ? 'quote_accepted' : 'quote_rejected';
  const title = status === 'accepted' 
    ? `Offerte geaccepteerd! 🎉` 
    : `Offerte afgewezen`;
  const message = status === 'accepted'
    ? `${companyName} heeft je offerte "${quoteTitle}" geaccepteerd!`
    : `${companyName} heeft je offerte "${quoteTitle}" afgewezen.`;

  return sendCRMNotification({
    recipient_id: createdBy,
    type,
    title,
    message,
    entity_type: 'quote',
    entity_id: quoteId,
    deep_link: `/quotes/${quoteId}`,
    priority: status === 'accepted' ? 'high' : 'normal',
  });
}

// Helper: Notify when project is assigned
export async function notifyProjectAssigned(
  projectId: string,
  ownerId: string,
  projectTitle: string,
  companyName: string
) {
  return sendCRMNotification({
    recipient_id: ownerId,
    type: 'lead_assigned',
    title: 'Nieuw project toegewezen',
    message: `Je bent toegewezen aan project "${projectTitle}" voor ${companyName}`,
    entity_type: 'project',
    entity_id: projectId,
    deep_link: `/projects/${projectId}`,
    priority: 'normal',
  });
}

// Helper: Notify when project stage changes to won/lost
export async function notifyDealClosed(
  projectId: string,
  ownerId: string,
  projectTitle: string,
  status: 'won' | 'lost',
  value: number
) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);

  const type: NotificationType = status === 'won' ? 'deal_won' : 'deal_lost';
  const title = status === 'won' ? `Deal gewonnen! 🎊` : `Deal verloren`;
  const message = status === 'won'
    ? `Project "${projectTitle}" is live gegaan! Waarde: ${formatCurrency(value)}`
    : `Project "${projectTitle}" is helaas verloren gegaan.`;

  return sendCRMNotification({
    recipient_id: ownerId,
    type,
    title,
    message,
    entity_type: 'project',
    entity_id: projectId,
    deep_link: `/projects/${projectId}`,
    priority: status === 'won' ? 'high' : 'normal',
  });
}

// Helper: Notify when project stage changes
export async function notifyProjectStageChanged(
  projectId: string,
  ownerId: string,
  projectTitle: string,
  oldStage: string,
  newStage: string
) {
  const stageLabels: Record<string, string> = {
    lead: 'Lead',
    quote_requested: 'Offerte aangevraagd',
    quote_sent: 'Offerte verzonden',
    negotiation: 'Onderhandeling',
    quote_signed: 'Contract getekend',
    in_development: 'In ontwikkeling',
    review: 'Review',
    live: 'Live',
    maintenance: 'Onderhoud',
    lost: 'Verloren',
  };

  return sendCRMNotification({
    recipient_id: ownerId,
    type: 'project_stage_changed',
    title: 'Project fase gewijzigd',
    message: `"${projectTitle}" is verplaatst van ${stageLabels[oldStage]} naar ${stageLabels[newStage]}`,
    entity_type: 'project',
    entity_id: projectId,
    deep_link: `/projects/${projectId}`,
    priority: 'normal',
  });
}

// Helper: Notify when new contact is created
export async function notifyContactCreated(
  contactId: string,
  ownerId: string,
  contactName: string,
  companyName?: string
) {
  const message = companyName
    ? `Nieuw contact "${contactName}" toegevoegd aan ${companyName}`
    : `Nieuw contact "${contactName}" toegevoegd`;

  return sendCRMNotification({
    recipient_id: ownerId,
    type: 'contact_created',
    title: 'Nieuw contact',
    message,
    entity_type: 'contact',
    entity_id: contactId,
    deep_link: `/contacts/${contactId}`,
    priority: 'low',
  });
}

// Helper: Notify when new company is created
export async function notifyCompanyCreated(
  companyId: string,
  ownerId: string,
  companyName: string
) {
  return sendCRMNotification({
    recipient_id: ownerId,
    type: 'company_created',
    title: 'Nieuw bedrijf',
    message: `Bedrijf "${companyName}" is toegevoegd aan je pipeline`,
    entity_type: 'company',
    entity_id: companyId,
    deep_link: `/companies/${companyId}`,
    priority: 'low',
  });
}

// Helper: Notify when deal is won (lead converted to customer)
export async function createDealWonNotification(
  projectId: string,
  ownerId: string,
  projectTitle: string,
  dealValue: number,
  companyName: string
) {
  const formatter = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  });

  return sendCRMNotification({
    recipient_id: ownerId,
    type: 'deal_won',
    title: '🎉 Deal Gewonnen!',
    message: `Gefeliciteerd! ${companyName} is nu een klant met project "${projectTitle}" (${formatter.format(dealValue)})`,
    entity_type: 'project',
    entity_id: projectId,
    deep_link: `/projects/${projectId}`,
    priority: 'high',
  });
}

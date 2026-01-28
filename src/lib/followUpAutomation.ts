/**
 * Follow-up Automation Logic
 * Automatically creates LinkedIn follow-up tasks 4 days after physical mail is sent
 */

import { supabase } from '@/integrations/supabase/client';
import { addDays } from 'date-fns';
import { logger } from '@/lib/logger';

interface CreateFollowUpTaskParams {
  interactionId: string;
  companyId: string;
  contactId?: string;
  userId: string;
}

/**
 * Creates an automatic follow-up task for a physical mail interaction
 * Should be called when a physical_mail interaction is created
 */
export async function createPhysicalMailFollowUp({
  interactionId,
  companyId,
  contactId,
  userId,
}: CreateFollowUpTaskParams) {
  try {
    // Calculate due date (4 days from now)
    const dueDate = addDays(new Date(), 4);

    // Get the original interaction details
    const { data: originalInteraction, error: fetchError } = await supabase
      .from('interactions')
      .select('subject, company:companies(name)')
      .eq('id', interactionId)
      .single();

    if (fetchError) {
      logger.error('Failed to fetch original interaction', { interactionId, error: fetchError });
      return { success: false, error: fetchError };
    }

    const companyName = originalInteraction?.company?.name || 'prospect';

    // Create the follow-up task
    const { data: followUpTask, error: createError } = await supabase
      .from('interactions')
      .insert({
        company_id: companyId,
        contact_id: contactId,
        user_id: userId,
        type: 'task',
        subject: `LinkedIn Follow-up: ${companyName}`,
        description: `Follow-up LinkedIn bericht sturen naar ${companyName} na fysiek kaartje.\n\nOriginele interactie: ${originalInteraction.subject}`,
        is_task: true,
        task_status: 'pending',
        due_date: dueDate.toISOString(),
        tags: ['auto-generated', 'follow-up', 'physical-mail'],
      })
      .select()
      .single();

    if (createError) {
      logger.error('Failed to create follow-up task', { interactionId, error: createError });
      return { success: false, error: createError };
    }

    logger.info('Follow-up task created successfully', { taskId: followUpTask?.id, companyId });
    return { success: true, data: followUpTask };
  } catch (error) {
    logger.error('Unexpected error creating follow-up task', { interactionId, error });
    return { success: false, error };
  }
}

/**
 * Hook into interaction creation to automatically create follow-ups
 * Call this function after successfully creating a physical_mail interaction
 */
export async function handleInteractionCreated(interaction: {
  id: string;
  type: string;
  company_id: string;
  contact_id?: string;
  user_id: string;
}) {
  // Only create follow-up for physical mail
  if (interaction.type !== 'physical_mail') {
    return;
  }

  await createPhysicalMailFollowUp({
    interactionId: interaction.id,
    companyId: interaction.company_id,
    contactId: interaction.contact_id,
    userId: interaction.user_id,
  });
}

/**
 * Batch process to check for physical mail interactions that need follow-ups
 * Can be run as a daily cron job or manual process
 */
export async function processOverdueFollowUps() {
  try {
    const fourDaysAgo = addDays(new Date(), -4);

    // Find physical_mail interactions from 4 days ago that don't have follow-ups yet
    const { data: physicalMailInteractions, error } = await supabase
      .from('interactions')
      .select('id, company_id, contact_id, user_id, subject')
      .eq('type', 'physical_mail')
      .gte('created_at', addDays(fourDaysAgo, -1).toISOString())
      .lte('created_at', fourDaysAgo.toISOString());

    if (error) {
      logger.error('Failed to fetch physical mail interactions', { error });
      return { success: false, error };
    }

    if (!physicalMailInteractions || physicalMailInteractions.length === 0) {
      logger.info('No physical mail interactions requiring follow-ups');
      return { success: true, processed: 0 };
    }

    let created = 0;
    let failed = 0;

    for (const interaction of physicalMailInteractions) {
      // Check if follow-up already exists
      const { data: existingFollowUp } = await supabase
        .from('interactions')
        .select('id')
        .eq('company_id', interaction.company_id)
        .eq('type', 'task')
        .ilike('subject', `%LinkedIn Follow-up%`)
        .gte('created_at', addDays(new Date(interaction.created_at), 3).toISOString())
        .single();

      if (existingFollowUp) {
        logger.debug('Follow-up already exists', { interactionId: interaction.id });
        continue;
      }

      // Create the follow-up
      const result = await createPhysicalMailFollowUp({
        interactionId: interaction.id,
        companyId: interaction.company_id,
        contactId: interaction.contact_id,
        userId: interaction.user_id,
      });

      if (result.success) {
        created++;
      } else {
        failed++;
      }
    }

    logger.info('Processed physical mail interactions', {
      total: physicalMailInteractions.length,
      created,
      failed
    });

    return { success: true, processed: physicalMailInteractions.length, created, failed };
  } catch (error) {
    logger.error('Unexpected error processing overdue follow-ups', { error });
    return { success: false, error };
  }
}

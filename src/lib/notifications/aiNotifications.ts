/**
 * AI Automation Notification Helpers
 * TypeScript wrapper functions for calling notification SQL functions
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface AIBulkOperationResult {
  success_count: number;
  failure_count: number;
  failures?: string[];
  items?: any[];
}

export type AIOperationType = 'scraping' | 'kvk_import' | 'bulk_email' | 'bulk_status_update';

/**
 * Send digest notification for AI bulk operations
 * Use this when scraping companies, importing from KVK, sending bulk emails, etc.
 */
export async function notifyAIBulkOperation(
  userId: string,
  operationType: AIOperationType,
  result: AIBulkOperationResult
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('notify_ai_bulk_operation', {
      p_user_id: userId,
      p_operation_type: operationType,
      p_success_count: result.success_count,
      p_failure_count: result.failure_count,
      p_details: {
        failures: result.failures || [],
        items: result.items || [],
      },
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    logger.error('Failed to send AI bulk operation notification', { userId, error });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send urgent notification for AI automation failure
 * Use this when a critical AI operation fails (e.g., email send failure, API error)
 */
export async function notifyAIFailure(
  userId: string,
  operation: string,
  entityType: string,
  entityId: string,
  errorMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('notify_ai_failure', {
      p_user_id: userId,
      p_operation: operation,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_error_message: errorMessage,
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    logger.error('Failed to send AI failure notification', { userId, operation, entityType, entityId, errorMessage, error });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Example: Notify after scraping companies from web
 */
export async function notifyScrapingComplete(
  userId: string,
  companiesScraped: number,
  companiesFailed: number,
  failureReasons: string[] = []
) {
  return notifyAIBulkOperation(userId, 'scraping', {
    success_count: companiesScraped,
    failure_count: companiesFailed,
    failures: failureReasons,
  });
}

/**
 * Example: Notify after KVK API import
 */
export async function notifyKVKImportComplete(
  userId: string,
  companiesImported: number,
  companiesFailed: number,
  failureReasons: string[] = []
) {
  return notifyAIBulkOperation(userId, 'kvk_import', {
    success_count: companiesImported,
    failure_count: companiesFailed,
    failures: failureReasons,
  });
}

/**
 * Example: Notify after bulk email send
 */
export async function notifyBulkEmailComplete(
  userId: string,
  emailsSent: number,
  emailsFailed: number,
  failureReasons: string[] = []
) {
  return notifyAIBulkOperation(userId, 'bulk_email', {
    success_count: emailsSent,
    failure_count: emailsFailed,
    failures: failureReasons,
  });
}

/**
 * Example: Notify after AI changes lead/project statuses
 */
export async function notifyBulkStatusUpdate(
  userId: string,
  recordsUpdated: number,
  recordsFailed: number,
  details?: any[]
) {
  return notifyAIBulkOperation(userId, 'bulk_status_update', {
    success_count: recordsUpdated,
    failure_count: recordsFailed,
    items: details,
  });
}

/**
 * Helper: Get user's notification preferences
 */
export async function getNotificationPreferences(userId: string) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    logger.error('Failed to fetch notification preferences', { userId, error });
    return null;
  }

  return data;
}

/**
 * Helper: Update user's notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<{
    channels: { in_app: boolean; email: boolean; sms: boolean };
    enabled_types: string[];
    digest_enabled: boolean;
    digest_frequency: 'hourly' | 'daily' | 'weekly';
    ai_notifications_enabled: boolean;
    ai_digest_only: boolean;
    ai_failure_notify: boolean;
  }>
) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to update notification preferences', { userId, preferences, error });
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

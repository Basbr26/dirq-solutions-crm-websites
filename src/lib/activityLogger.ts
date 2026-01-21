import { supabase } from '@/integrations/supabase/client';

export type ActionType = 
  | 'case_created'
  | 'case_updated'
  | 'case_closed'
  | 'case_reopened'
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'document_uploaded'
  | 'document_signed'
  | 'document_deleted'
  | 'conversation_added'
  | 'status_changed'
  | 'recovery_reported'
  | 'user_login'
  | 'user_logout';

export type EntityType = 
  | 'sick_leave_case'
  | 'task'
  | 'document'
  | 'conversation_note'
  | 'user';

interface LogActivityParams {
  caseId?: string;
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  description: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function logActivity({
  caseId,
  actionType,
  entityType,
  entityId,
  description,
  metadata = {}
}: LogActivityParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log activity: No user logged in');
      return;
    }

    const { error } = await supabase
      .from('activity_logs')
      .insert([{
        user_id: user.id,
        case_id: caseId || null,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId || null,
        description,
        metadata
      }]);

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Error in logActivity:', err);
  }
}

// Use i18n for action type display names
// Access via t('activity.types.case_created'), etc.
// Kept for backward compatibility but deprecated
export const actionTypeLabels: Record<ActionType, string> = {
  case_created: 'activity.types.case_created',
  case_updated: 'activity.types.case_updated',
  case_closed: 'activity.types.case_closed',
  case_reopened: 'activity.types.case_reopened',
  task_created: 'activity.types.task_created',
  task_completed: 'activity.types.task_completed',
  task_updated: 'activity.types.task_updated',
  document_uploaded: 'activity.types.document_uploaded',
  document_signed: 'activity.types.document_signed',
  document_deleted: 'activity.types.document_deleted',
  conversation_added: 'activity.types.conversation_added',
  status_changed: 'activity.types.status_changed',
  recovery_reported: 'activity.types.recovery_reported',
  user_login: 'activity.types.user_login',
  user_logout: 'activity.types.user_logout'
};

// Use i18n for entity type display names
// Access via t('activity.entities.sick_leave_case'), etc.
// Kept for backward compatibility but deprecated
export const entityTypeLabels: Record<EntityType, string> = {
  sick_leave_case: 'activity.entities.sick_leave_case',
  task: 'activity.entities.task',
  document: 'activity.entities.document',
  conversation_note: 'activity.entities.conversation_note',
  user: 'activity.entities.user'
};

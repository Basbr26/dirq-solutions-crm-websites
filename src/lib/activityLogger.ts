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

// Action type display names in Dutch
export const actionTypeLabels: Record<ActionType, string> = {
  case_created: 'Case aangemaakt',
  case_updated: 'Case bijgewerkt',
  case_closed: 'Case gesloten',
  case_reopened: 'Case heropend',
  task_created: 'Taak aangemaakt',
  task_completed: 'Taak afgerond',
  task_updated: 'Taak bijgewerkt',
  document_uploaded: 'Document geüpload',
  document_signed: 'Document ondertekend',
  document_deleted: 'Document verwijderd',
  conversation_added: 'Gesprek toegevoegd',
  status_changed: 'Status gewijzigd',
  recovery_reported: 'Herstel gemeld',
  user_login: 'Ingelogd',
  user_logout: 'Uitgelogd'
};

// Entity type display names in Dutch
export const entityTypeLabels: Record<EntityType, string> = {
  sick_leave_case: 'Verzuimdossier',
  task: 'Taak',
  document: 'Document',
  conversation_note: 'Gespreksnotitie',
  user: 'Gebruiker'
};

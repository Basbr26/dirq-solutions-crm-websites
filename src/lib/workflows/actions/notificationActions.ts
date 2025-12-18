/**
 * Workflow Actions - Notifications
 * Send in-app notifications via workflow actions
 */

import { supabase } from '@/integrations/supabase/client';
import { NotificationActionConfig, WorkflowContext } from '../types';
import { resolveObject } from '../context';

// ============================================================================
// NOTIFICATION ACTIONS
// ============================================================================

export async function executeSendNotification(
  config: NotificationActionConfig,
  context: WorkflowContext
): Promise<{ success: boolean; notification_ids?: string[]; error?: string }> {
  try {
    // Resolve variables in config
    const resolved = resolveObject(config, context) as NotificationActionConfig;

    // Get recipient(s)
    const recipients = Array.isArray(resolved.user_id) 
      ? resolved.user_id 
      : [resolved.user_id];

    // Create notifications for each recipient
    const notifications = recipients.map(userId => ({
      recipient_id: userId,
      type: resolved.type || 'info',
      title: resolved.title,
      message: resolved.message,
      link: resolved.link || null,
      metadata: {
        workflow_execution_id: context.execution_id,
        ...context.metadata,
      },
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id');

    if (error) {
      throw error;
    }

    return {
      success: true,
      notification_ids: data?.map(n => n.id) || [],
    };
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return {
      success: false,
      error: error.message || 'Failed to send notification',
    };
  }
}

export async function executeSendBulkNotification(
  config: {
    role?: string; // Send to all users with this role
    department_id?: string; // Send to all users in department
    title: string;
    message: string;
    type?: string;
    link?: string;
  },
  context: WorkflowContext
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const resolved = resolveObject(config, context);

    // Get recipient IDs based on filters
    let recipientIds: string[] = [];

    if (resolved.role) {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', resolved.role);
      
      recipientIds = data?.map(r => r.user_id) || [];
    } else if (resolved.department_id) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('department_id', resolved.department_id);
      
      recipientIds = data?.map(p => p.id) || [];
    }

    if (recipientIds.length === 0) {
      return {
        success: true,
        count: 0,
      };
    }

    // Create notifications
    const notifications = recipientIds.map(userId => ({
      recipient_id: userId,
      type: resolved.type || 'info',
      title: resolved.title,
      message: resolved.message,
      link: resolved.link || null,
      metadata: {
        workflow_execution_id: context.execution_id,
      },
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      throw error;
    }

    return {
      success: true,
      count: recipientIds.length,
    };
  } catch (error: any) {
    console.error('Error sending bulk notification:', error);
    return {
      success: false,
      error: error.message || 'Failed to send bulk notification',
    };
  }
}

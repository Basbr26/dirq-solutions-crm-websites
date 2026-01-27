/**
 * Workflow Actions - Index
 * Central export for all action handlers
 */

import { WorkflowContext, ActionConfig } from '../types';
import { executeSendEmail } from './emailActions';
import { executeCreateTask, executeUpdateTask, executeCompleteTask } from './taskActions';
import { executeSendNotification, executeSendBulkNotification } from './notificationActions';
import {
  executeCreateRecord,
  executeUpdateRecord,
  executeDeleteRecord,
  executeRunQuery,
} from './databaseActions';

// ============================================================================
// ACTION EXECUTOR
// ============================================================================

export async function executeAction(
  config: ActionConfig,
  context: WorkflowContext
): Promise<{ success: boolean; output?: any; error?: string }> {
  try {
    const { action } = config;

    switch (action) {
      // Email actions
      case 'send_email':
        return await executeSendEmail(config as any, context);

      // Task actions
      case 'create_task':
        return await executeCreateTask(config as any, context);
      case 'update_task':
        return await executeUpdateTask(config as any, context);
      case 'complete_task':
        return await executeCompleteTask(config as any, context);

      // Notification actions
      case 'send_notification':
        return await executeSendNotification(config as any, context);
      case 'send_bulk_notification':
        return await executeSendBulkNotification(config as any, context);

      // Database actions
      case 'create_record':
        return await executeCreateRecord(config as any, context);
      case 'update_record':
        return await executeUpdateRecord(config as any, context);
      case 'delete_record':
        return await executeDeleteRecord(config as any, context);
      case 'run_query':
        return await executeRunQuery(config as any, context);

      // Webhook action
      case 'call_webhook':
        return await executeCallWebhook(config as any, context);

      default:
        return {
          success: false,
          error: `Unknown action type: ${action}`,
        };
    }
  } catch (error: any) {
    console.error('Error executing action:', error);
    return {
      success: false,
      error: error.message || 'Failed to execute action',
    };
  }
}

// ============================================================================
// WEBHOOK ACTION
// ============================================================================

async function executeCallWebhook(
  config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: Record<string, any>;
  },
  context: WorkflowContext
): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    const { resolveObject } = await import('../context');
    const resolved = resolveObject(config, context);

    const options: RequestInit = {
      method: resolved.method,
      headers: {
        'Content-Type': 'application/json',
        ...resolved.headers,
      },
    };

    if (resolved.body && ['POST', 'PUT'].includes(resolved.method)) {
      options.body = JSON.stringify(resolved.body);
    }

    const response = await fetch(resolved.url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    return {
      success: true,
      response: data,
    };
  } catch (error: any) {
    console.error('Error calling webhook:', error);
    return {
      success: false,
      error: error.message || 'Failed to call webhook',
    };
  }
}

// Export individual action executors for direct use
export {
  executeSendEmail,
  executeCreateTask,
  executeUpdateTask,
  executeCompleteTask,
  executeSendNotification,
  executeSendBulkNotification,
  executeCreateRecord,
  executeUpdateRecord,
  executeDeleteRecord,
  executeRunQuery,
  executeCallWebhook,
};

/**
 * Workflow Actions - Tasks
 * Create and manage tasks via workflow actions
 */

import { supabase } from '@/integrations/supabase/client';
import { TaskActionConfig, WorkflowContext } from '../types';
import { resolveObject, resolveVariable } from '../context';

// ============================================================================
// TASK ACTIONS
// ============================================================================

export async function executeCreateTask(
  config: TaskActionConfig,
  context: WorkflowContext
): Promise<{ success: boolean; task_id?: string; error?: string }> {
  try {
    // Resolve variables in config
    const resolved = resolveObject(config, context) as TaskActionConfig;

    // Parse due date if string
    let dueDate: Date | null = null;
    if (resolved.due_date) {
      dueDate = new Date(resolved.due_date);
      if (isNaN(dueDate.getTime())) {
        dueDate = null;
      }
    }

    // Create task in database
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: resolved.title,
        description: resolved.description || null,
        assigned_to: resolved.assigned_to,
        case_id: resolved.case_id || null,
        due_date: dueDate?.toISOString(),
        priority: resolved.priority || 'medium',
        status: 'open',
        created_by: context.user_id || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Send notification to assignee
    if (data && resolved.assigned_to) {
      await supabase.from('notifications').insert({
        recipient_id: resolved.assigned_to,
        type: 'task_assigned',
        title: 'Nieuwe taak toegewezen',
        message: resolved.title,
        link: `/tasks`,
        metadata: { task_id: data.id },
      });
    }

    return {
      success: true,
      task_id: data.id,
    };
  } catch (error: any) {
    console.error('Error creating task:', error);
    return {
      success: false,
      error: error.message || 'Failed to create task',
    };
  }
}

export async function executeUpdateTask(
  config: {
    task_id: string;
    status?: string;
    assigned_to?: string;
    due_date?: string;
    [key: string]: any;
  },
  context: WorkflowContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const resolved = resolveObject(config, context);
    const { task_id, ...updates } = resolved;

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task_id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating task:', error);
    return {
      success: false,
      error: error.message || 'Failed to update task',
    };
  }
}

export async function executeCompleteTask(
  config: { task_id: string },
  context: WorkflowContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const resolved = resolveObject(config, context);

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', resolved.task_id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error completing task:', error);
    return {
      success: false,
      error: error.message || 'Failed to complete task',
    };
  }
}

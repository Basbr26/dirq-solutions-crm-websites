/**
 * Workflow Scheduler
 * Process scheduled workflows and resume waiting executions
 */

import { supabase } from '@/integrations/supabase/client';
import { WorkflowEngine } from './engine';
import { WorkflowExecutionOptions } from './types';
import cron from 'cron-parser';

// ============================================================================
// SCHEDULER
// ============================================================================

export class WorkflowScheduler {
  /**
   * Process all due scheduled workflows
   * Should be called by a cron job (e.g., every minute)
   */
  static async processDueSchedules(): Promise<{
    success: boolean;
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      console.log('[Workflow Scheduler] Processing due schedules...');

      // Get all enabled schedules that are due
      const { data: schedules, error } = await supabase
        .from('workflow_schedules')
        .select('*')
        .eq('enabled', true)
        .or(`next_run.is.null,next_run.lte.${new Date().toISOString()}`);

      if (error) {
        throw error;
      }

      if (!schedules || schedules.length === 0) {
        console.log('[Workflow Scheduler] No due schedules found');
        return { success: true, processed: 0, errors: [] };
      }

      console.log(`[Workflow Scheduler] Found ${schedules.length} due schedules`);

      // Process each schedule
      for (const schedule of schedules) {
        try {
          // Execute workflow
          console.log(`[Workflow Scheduler] Executing workflow: ${schedule.workflow_id}`);
          
          await WorkflowEngine.executeWorkflow(schedule.workflow_id, {
            metadata: {
              triggered_by: 'schedule',
              schedule_id: schedule.id,
            },
          });

          // Calculate next run time
          const nextRun = this.calculateNextRun(
            schedule.cron_expression,
            schedule.timezone || 'UTC'
          );

          // Update schedule
          await supabase
            .from('workflow_schedules')
            .update({
              last_run: new Date().toISOString(),
              next_run: nextRun?.toISOString() || null,
            })
            .eq('id', schedule.id);

          processed++;
        } catch (error: any) {
          console.error(`[Workflow Scheduler] Failed to process schedule ${schedule.id}:`, error);
          errors.push(`Schedule ${schedule.id}: ${error.message}`);
        }
      }

      console.log(`[Workflow Scheduler] Processed ${processed} schedules`);

      return {
        success: errors.length === 0,
        processed,
        errors,
      };
    } catch (error: any) {
      console.error('[Workflow Scheduler] Error processing schedules:', error);
      return {
        success: false,
        processed,
        errors: [error.message],
      };
    }
  }

  /**
   * Resume all waiting workflows that are ready
   * Should be called by a cron job (e.g., every minute)
   */
  static async resumeWaitingWorkflows(): Promise<{
    success: boolean;
    resumed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let resumed = 0;

    try {
      console.log('[Workflow Scheduler] Resuming waiting workflows...');

      // Get all waiting executions that are ready to resume
      const { data: executions, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('status', 'waiting')
        .lte('resume_at', new Date().toISOString());

      if (error) {
        throw error;
      }

      if (!executions || executions.length === 0) {
        console.log('[Workflow Scheduler] No workflows ready to resume');
        return { success: true, resumed: 0, errors: [] };
      }

      console.log(`[Workflow Scheduler] Found ${executions.length} workflows to resume`);

      // Resume each execution
      for (const execution of executions) {
        try {
          console.log(`[Workflow Scheduler] Resuming execution: ${execution.id}`);
          
          await WorkflowEngine.resumeWorkflow(execution.id);
          resumed++;
        } catch (error: any) {
          console.error(`[Workflow Scheduler] Failed to resume execution ${execution.id}:`, error);
          errors.push(`Execution ${execution.id}: ${error.message}`);
        }
      }

      console.log(`[Workflow Scheduler] Resumed ${resumed} workflows`);

      return {
        success: errors.length === 0,
        resumed,
        errors,
      };
    } catch (error: any) {
      console.error('[Workflow Scheduler] Error resuming workflows:', error);
      return {
        success: false,
        resumed,
        errors: [error.message],
      };
    }
  }

  /**
   * Calculate next run time from cron expression
   */
  private static calculateNextRun(cronExpression: string, timezone: string): Date | null {
    try {
      const interval = cron.parseExpression(cronExpression, {
        currentDate: new Date(),
        tz: timezone,
      });

      return interval.next().toDate();
    } catch (error) {
      console.error('Failed to parse cron expression:', error);
      return null;
    }
  }

  /**
   * Validate cron expression
   */
  static validateCronExpression(cronExpression: string): boolean {
    try {
      cron.parseExpression(cronExpression);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get human-readable description of cron schedule
   */
  static describeCronExpression(cronExpression: string): string {
    // Basic descriptions for common cron patterns
    const patterns: Record<string, string> = {
      '* * * * *': 'Elke minuut',
      '0 * * * *': 'Elk uur',
      '0 0 * * *': 'Dagelijks om middernacht',
      '0 9 * * *': 'Dagelijks om 9:00',
      '0 9 * * 1': 'Elke maandag om 9:00',
      '0 9 * * 1-5': 'Elke werkdag om 9:00',
      '0 0 1 * *': 'Maandelijks op de 1e',
      '0 0 * * 0': 'Wekelijks op zondag',
    };

    return patterns[cronExpression] || cronExpression;
  }

  /**
   * Create or update a workflow schedule
   */
  static async scheduleWorkflow(
    workflowId: string,
    cronExpression: string,
    options: {
      timezone?: string;
      enabled?: boolean;
    } = {}
  ): Promise<{ success: boolean; schedule_id?: string; error?: string }> {
    try {
      // Validate cron expression
      if (!this.validateCronExpression(cronExpression)) {
        throw new Error('Invalid cron expression');
      }

      // Calculate next run
      const nextRun = this.calculateNextRun(
        cronExpression,
        options.timezone || 'UTC'
      );

      // Check if schedule already exists
      const { data: existing } = await supabase
        .from('workflow_schedules')
        .select('id')
        .eq('workflow_id', workflowId)
        .single();

      if (existing) {
        // Update existing schedule
        const { data, error } = await supabase
          .from('workflow_schedules')
          .update({
            cron_expression: cronExpression,
            timezone: options.timezone || 'UTC',
            enabled: options.enabled !== false,
            next_run: nextRun?.toISOString() || null,
          })
          .eq('id', existing.id)
          .select('id')
          .single();

        if (error) throw error;

        return {
          success: true,
          schedule_id: data.id,
        };
      } else {
        // Create new schedule
        const { data, error } = await supabase
          .from('workflow_schedules')
          .insert({
            workflow_id: workflowId,
            cron_expression: cronExpression,
            timezone: options.timezone || 'UTC',
            enabled: options.enabled !== false,
            next_run: nextRun?.toISOString() || null,
          })
          .select('id')
          .single();

        if (error) throw error;

        return {
          success: true,
          schedule_id: data.id,
        };
      }
    } catch (error: any) {
      console.error('Error scheduling workflow:', error);
      return {
        success: false,
        error: error.message || 'Failed to schedule workflow',
      };
    }
  }

  /**
   * Disable a workflow schedule
   */
  static async disableSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('workflow_schedules')
        .update({ enabled: false })
        .eq('id', scheduleId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to disable schedule',
      };
    }
  }
}

// Export convenience functions
export async function processDueSchedules() {
  return WorkflowScheduler.processDueSchedules();
}

export async function resumeWaitingWorkflows() {
  return WorkflowScheduler.resumeWaitingWorkflows();
}

export async function scheduleWorkflow(
  workflowId: string,
  cronExpression: string,
  options?: {
    timezone?: string;
    enabled?: boolean;
  }
) {
  return WorkflowScheduler.scheduleWorkflow(workflowId, cronExpression, options);
}

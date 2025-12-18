// Supabase Edge Function: workflow-scheduler
// Runs every minute to process scheduled workflows and resume waiting executions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Workflow Scheduler] Starting scheduled execution...');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      scheduled_processed: 0,
      workflows_resumed: 0,
      pending_executed: 0,
      errors: [] as string[],
    };

    // ========================================================================
    // 1. Process due scheduled workflows
    // ========================================================================
    
    const { data: schedules, error: schedulesError } = await supabase
      .from('workflow_schedules')
      .select('*')
      .eq('enabled', true)
      .or(`next_run.is.null,next_run.lte.${new Date().toISOString()}`);

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      results.errors.push(`Schedules: ${schedulesError.message}`);
    } else if (schedules && schedules.length > 0) {
      console.log(`[Workflow Scheduler] Processing ${schedules.length} due schedules`);

      for (const schedule of schedules) {
        try {
          // Get workflow
          const { data: workflow } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', schedule.workflow_id)
            .single();

          if (!workflow || !workflow.active) {
            console.log(`Skipping inactive workflow: ${schedule.workflow_id}`);
            continue;
          }

          // Create execution
          const { data: execution, error: execError } = await supabase
            .from('workflow_executions')
            .insert({
              workflow_id: schedule.workflow_id,
              status: 'pending',
              context: {
                workflow_id: schedule.workflow_id,
                execution_id: crypto.randomUUID(),
                trigger_data: {
                  event: 'schedule',
                  schedule_id: schedule.id,
                },
                variables: {},
                metadata: {
                  triggered_by: 'schedule',
                },
              },
            })
            .select()
            .single();

          if (execError) {
            throw execError;
          }

          // Calculate next run (basic implementation, use cron-parser in production)
          const nextRun = calculateNextRun(schedule.cron_expression);

          // Update schedule
          await supabase
            .from('workflow_schedules')
            .update({
              last_run: new Date().toISOString(),
              next_run: nextRun,
            })
            .eq('id', schedule.id);

          results.scheduled_processed++;
          console.log(`Scheduled workflow execution created: ${execution.id}`);
        } catch (error: any) {
          console.error(`Error processing schedule ${schedule.id}:`, error);
          results.errors.push(`Schedule ${schedule.id}: ${error.message}`);
        }
      }
    }

    // ========================================================================
    // 2. Resume waiting workflows
    // ========================================================================
    
    const { data: waiting, error: waitingError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('status', 'waiting')
      .lte('resume_at', new Date().toISOString());

    if (waitingError) {
      console.error('Error fetching waiting workflows:', waitingError);
      results.errors.push(`Waiting: ${waitingError.message}`);
    } else if (waiting && waiting.length > 0) {
      console.log(`[Workflow Scheduler] Resuming ${waiting.length} waiting workflows`);

      for (const execution of waiting) {
        try {
          // Mark as pending to be picked up by execution processor
          await supabase
            .from('workflow_executions')
            .update({ status: 'pending' })
            .eq('id', execution.id);

          results.workflows_resumed++;
          console.log(`Resumed workflow execution: ${execution.id}`);
        } catch (error: any) {
          console.error(`Error resuming execution ${execution.id}:`, error);
          results.errors.push(`Resume ${execution.id}: ${error.message}`);
        }
      }
    }

    // ========================================================================
    // 3. Check for contract expiring
    // ========================================================================
    
    try {
      const { error: contractError } = await supabase
        .rpc('trigger_workflow_on_contract_expiring');

      if (contractError) {
        throw contractError;
      }

      console.log('[Workflow Scheduler] Checked for expiring contracts');
    } catch (error: any) {
      console.error('Error checking expiring contracts:', error);
      results.errors.push(`Contracts: ${error.message}`);
    }

    // ========================================================================
    // Return results
    // ========================================================================

    console.log('[Workflow Scheduler] Completed:', results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[Workflow Scheduler] Fatal error:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});

// Helper: Calculate next run time (basic implementation)
function calculateNextRun(cronExpression: string): string {
  // This is a simplified version. In production, use cron-parser library
  const now = new Date();
  
  // Common patterns
  if (cronExpression === '0 * * * *') {
    // Every hour
    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  } else if (cronExpression === '0 0 * * *') {
    // Daily at midnight
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  } else if (cronExpression === '* * * * *') {
    // Every minute
    return new Date(now.getTime() + 60 * 1000).toISOString();
  }
  
  // Default: 1 hour from now
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
}

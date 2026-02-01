// Supabase Edge Function: workflow-executor
// Execute pending workflows (called by scheduler or manually)

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
    const { execution_id } = await req.json();

    console.log(`[Workflow Executor] Executing workflow: ${execution_id || 'next pending'}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get execution to process
    let execution;
    
    if (execution_id) {
      // Specific execution requested
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*, workflow:workflows(*)')
        .eq('id', execution_id)
        .single();

      if (error) throw error;
      execution = data;
    } else {
      // Get next pending execution
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*, workflow:workflows(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ message: 'No pending executions' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      execution = data;
    }

    // Mark as running
    await supabase
      .from('workflow_executions')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', execution.id);

    // Execute workflow
    const result = await executeWorkflow(execution, supabase);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[Workflow Executor] Error:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});

// ============================================================================
// WORKFLOW EXECUTION LOGIC
// ============================================================================

async function executeWorkflow(execution: any, supabase: any) {
  try {
    const workflow = execution.workflow;
    const context = execution.context;

    if (!workflow || !workflow.nodes) {
      throw new Error('Invalid workflow definition');
    }

    const definition = workflow.nodes;
    
    // Find trigger node (starting point)
    const triggerNode = definition.nodes.find((n: any) => n.type === 'trigger');
    if (!triggerNode) {
      throw new Error('Workflow has no trigger node');
    }

    // Execute workflow starting from trigger
    let currentNodeId = triggerNode.id;
    let nodeCount = 0;
    const maxNodes = 50; // Prevent infinite loops

    while (currentNodeId && nodeCount < maxNodes) {
      const node = definition.nodes.find((n: any) => n.id === currentNodeId);
      
      if (!node) {
        console.error(`Node not found: ${currentNodeId}`);
        break;
      }

      nodeCount++;

      // Update current node
      await supabase
        .from('workflow_executions')
        .update({ current_node_id: currentNodeId, context })
        .eq('id', execution.id);

      // Execute node
      const result = await executeNode(node, context, supabase);

      // Log execution
      await logNodeExecution(execution.id, node, result, supabase);

      if (!result.success) {
        throw new Error(result.error || 'Node execution failed');
      }

      // Check if we should wait
      if (result.should_wait) {
        await supabase
          .from('workflow_executions')
          .update({
            status: 'waiting',
            resume_at: result.wait_until,
          })
          .eq('id', execution.id);

        return {
          success: true,
          status: 'waiting',
          execution_id: execution.id,
          resume_at: result.wait_until,
        };
      }

      // Store output
      if (result.output) {
        context.variables = {
          ...context.variables,
          [node.id]: result.output,
          ...result.output,
        };
      }

      // Get next node
      if (result.next_node_id) {
        currentNodeId = result.next_node_id;
      } else {
        const nextEdge = definition.edges.find((e: any) => e.source === currentNodeId);
        currentNodeId = nextEdge?.target || null;
      }
    }

    // Mark as completed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id);

    return {
      success: true,
      status: 'completed',
      execution_id: execution.id,
      nodes_executed: nodeCount,
    };
  } catch (error: any) {
    console.error('[Workflow Executor] Execution failed:', error);

    // Mark as failed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id);

    return {
      success: false,
      status: 'failed',
      execution_id: execution.id,
      error: error.message,
    };
  }
}

// ============================================================================
// NODE EXECUTION
// ============================================================================

async function executeNode(node: any, context: any, supabase: any) {
  const startTime = Date.now();

  try {
    console.log(`[Executor] Executing node: ${node.id} (${node.type})`);

    switch (node.type) {
      case 'trigger':
        return { success: true, output: { triggered_at: new Date().toISOString() } };

      case 'action':
        return await executeAction(node.config, context, supabase);

      case 'condition':
        return evaluateCondition(node, context);

      case 'wait':
        return handleWait(node.config);

      default:
        return { success: false, error: `Unknown node type: ${node.type}` };
    }
  } catch (error: any) {
    console.error(`[Executor] Node ${node.id} failed:`, error);
    return {
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime,
    };
  }
}

// Execute action node
async function executeAction(config: any, context: any, supabase: any) {
  const action = config.action;
  const resolved = resolveTemplate(config, context);

  switch (action) {
    case 'send_email':
      // Would call email service
      console.log('[Action] Send email:', resolved.to, resolved.subject);
      return { success: true, output: { email_sent: true } };

    case 'send_notification':
      const recipients = Array.isArray(resolved.user_id) ? resolved.user_id : [resolved.user_id];
      const notifications = recipients.map((userId: string) => ({
        recipient_id: userId,
        type: resolved.type || 'info',
        title: resolved.title,
        message: resolved.message,
        link: resolved.link || null,
      }));

      await supabase.from('notifications').insert(notifications);
      return { success: true, output: { notifications_sent: recipients.length } };

    case 'create_task':
      const { data: task } = await supabase
        .from('tasks')
        .insert({
          title: resolved.title,
          description: resolved.description,
          assigned_to: resolved.assigned_to,
          case_id: resolved.case_id,
          priority: resolved.priority || 'normal',
          status: 'open',
        })
        .select()
        .single();

      return { success: true, output: { task_id: task?.id } };

    case 'update_record':
    case 'create_record':
      const { data: record } = await supabase
        .from(resolved.table)
        [action === 'create_record' ? 'insert' : 'update'](resolved.data)
        .select()
        .single();

      return { success: true, output: { record } };

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}

// Evaluate condition node
function evaluateCondition(node: any, context: any) {
  const config = node.config;
  const fieldValue = resolveVariable(config.field, context);
  let conditionMet = false;

  switch (config.operator) {
    case 'equals':
      conditionMet = fieldValue == config.value;
      break;
    case 'not_equals':
      conditionMet = fieldValue != config.value;
      break;
    case 'is_null':
      conditionMet = fieldValue === null || fieldValue === undefined;
      break;
    case 'is_not_null':
      conditionMet = fieldValue !== null && fieldValue !== undefined;
      break;
    default:
      conditionMet = false;
  }

  const nextNodeId = conditionMet ? node.trueBranch : node.falseBranch;
  
  return {
    success: true,
    output: { condition_result: conditionMet },
    next_node_id: nextNodeId,
  };
}

// Handle wait node
function handleWait(config: any) {
  let waitUntil;

  if (config.duration) {
    const durationMs = parseDuration(config.duration);
    waitUntil = new Date(Date.now() + durationMs).toISOString();
  } else if (config.until) {
    waitUntil = new Date(config.until).toISOString();
  }

  return {
    success: true,
    should_wait: true,
    wait_until: waitUntil,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function resolveTemplate(obj: any, context: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\{\{([^}]+)\}\}/g, (_: string, path: string) => {
      return resolveVariable(path.trim(), context) || '';
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveTemplate(item, context));
  }

  if (obj && typeof obj === 'object') {
    const resolved: any = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveTemplate(value, context);
    }
    return resolved;
  }

  return obj;
}

function resolveVariable(path: string, context: any): any {
  const parts = path.split('.');
  let current = context;

  // Try trigger_data first
  current = context.trigger_data;
  for (const part of parts) {
    if (!current) return undefined;
    current = current[part];
  }
  if (current !== undefined) return current;

  // Try variables
  current = context.variables;
  for (const part of parts) {
    if (!current) return undefined;
    current = current[part];
  }
  
  return current;
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhdw])$/);
  if (!match) return 0;

  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers: any = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  
  return value * (multipliers[unit] || 0);
}

async function logNodeExecution(executionId: string, node: any, result: any, supabase: any) {
  await supabase.from('workflow_logs').insert({
    execution_id: executionId,
    node_id: node.id,
    node_type: node.type,
    status: result.success ? 'completed' : 'failed',
    output: result.output,
    error: result.error,
    duration_ms: result.duration_ms,
  });
}

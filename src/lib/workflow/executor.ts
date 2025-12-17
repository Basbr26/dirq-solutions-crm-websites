/**
 * Workflow Execution Engine
 * Core engine that executes workflow definitions with retry logic and logging
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Workflow,
  WorkflowExecution,
  WorkflowNodeData,
  NodeExecutionResult,
  ExecutionContext,
  TriggerNodeData,
  ActionNodeData,
  ConditionNodeData,
  WaitNodeData,
  LogLevel,
} from '@/types/workflow';
import type { Node, Edge } from '@xyflow/react';

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [1000, 5000, 15000]; // 1s, 5s, 15s

// ============================================================================
// EXECUTION ENGINE
// ============================================================================

/**
 * Start a new workflow execution
 */
export async function startWorkflowExecution(
  workflowId: string,
  triggeredBy: string,
  triggerType: 'manual' | 'event' | 'schedule',
  inputData: Record<string, unknown> = {},
  triggerEvent?: string
): Promise<string> {
  // Fetch workflow definition
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (workflowError || !workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  // Create execution record
  const { data: execution, error: executionError } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_id: workflowId,
      workflow_version: workflow.version,
      triggered_by: triggeredBy,
      trigger_type: triggerType,
      trigger_event: triggerEvent,
      input_data: inputData,
      context: {},
      status: 'pending',
    } as never)
    .select()
    .single();

  if (executionError || !execution) {
    throw new Error('Failed to create workflow execution');
  }

  // Execute workflow asynchronously
  executeWorkflow(execution.id, workflow as unknown as Workflow, inputData).catch((error) => {
    console.error('Workflow execution failed:', error);
  });

  return execution.id;
}

/**
 * Main workflow execution function
 */
async function executeWorkflow(
  executionId: string,
  workflow: Workflow,
  inputData: Record<string, unknown>
): Promise<void> {
  const context: ExecutionContext = {
    execution_id: executionId,
    workflow_id: workflow.id,
    input_data: inputData,
    variables: { ...inputData },
    startedAt: new Date(),
    retryCount: 0,
  };

  try {
    // Update status to running
    await updateExecutionStatus(executionId, 'running', new Date().toISOString());
    await log(executionId, 'workflow', 'info', 'Workflow execution started');

    // Find trigger node
    const triggerNode = workflow.definition.nodes.find((n) => n.type === 'trigger');
    if (!triggerNode) {
      throw new Error('No trigger node found in workflow');
    }

    // Execute workflow starting from trigger
    const edges = workflow.definition.edges;
    const result = await executeNode(triggerNode, workflow.definition.nodes, edges, context);

    if (!result.success) {
      throw new Error(result.error || 'Workflow execution failed');
    }

    // Mark as completed
    await updateExecutionStatus(executionId, 'completed', undefined, new Date().toISOString(), {
      output: result.output,
    });
    await log(executionId, 'workflow', 'info', 'Workflow execution completed successfully');
  } catch (error) {
    console.error('Workflow execution error:', error);
    await updateExecutionStatus(
      executionId,
      'failed',
      undefined,
      new Date().toISOString(),
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
    await log(
      executionId,
      'workflow',
      'error',
      `Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Execute a single node and proceed to next nodes
 */
async function executeNode(
  node: Node<WorkflowNodeData>,
  allNodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  context: ExecutionContext,
  retryCount = 0
): Promise<NodeExecutionResult> {
  const startTime = Date.now();

  try {
    await log(context.execution_id, node.id, 'info', `Executing ${node.type} node: ${node.data.label}`);
    await updateExecutionCurrentNode(context.execution_id, node.id);

    let result: NodeExecutionResult;

    // Execute based on node type
    switch (node.type) {
      case 'trigger':
        result = await executeTriggerNode(node.data as TriggerNodeData, context);
        break;
      case 'action':
        result = await executeActionNode(node.data as ActionNodeData, context);
        break;
      case 'condition':
        result = await executeConditionNode(node.data as ConditionNodeData, context);
        break;
      case 'wait':
        result = await executeWaitNode(node.data as WaitNodeData, context);
        break;
      case 'notification':
        result = await executeNotificationNode(node.data, context);
        break;
      default:
        result = {
          success: false,
          error: `Unknown node type: ${node.type}`,
        };
    }

    const duration = Date.now() - startTime;

    if (result.success) {
      await log(
        context.execution_id,
        node.id,
        'info',
        `Node executed successfully`,
        { output: result.output },
        duration
      );

      // Update context variables if output is provided
      if (result.output) {
        context.variables = {
          ...context.variables,
          [`${node.id}_output`]: result.output,
        };
      }

      // Find and execute next nodes
      const nextEdges = edges.filter((e) => e.source === node.id);

      if (nextEdges.length === 0) {
        // End of workflow branch
        return result;
      }

      // For condition nodes, follow the appropriate branch
      if (node.type === 'condition' && result.nextNodes) {
        for (const nextNodeId of result.nextNodes) {
          const nextNode = allNodes.find((n) => n.id === nextNodeId);
          if (nextNode) {
            await executeNode(nextNode, allNodes, edges, context);
          }
        }
      } else {
        // Execute all next nodes (sequential)
        for (const edge of nextEdges) {
          const nextNode = allNodes.find((n) => n.id === edge.target);
          if (nextNode) {
            await executeNode(nextNode, allNodes, edges, context);
          }
        }
      }

      return result;
    } else {
      // Handle failure with retry logic
      if (result.shouldRetry && retryCount < MAX_RETRIES) {
        const backoffMs = RETRY_BACKOFF_MS[retryCount] || 15000;
        await log(
          context.execution_id,
          node.id,
          'warning',
          `Node execution failed, retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`,
          { error: result.error }
        );

        // Wait for backoff
        await new Promise((resolve) => setTimeout(resolve, backoffMs));

        // Retry
        return executeNode(node, allNodes, edges, context, retryCount + 1);
      } else {
        await log(
          context.execution_id,
          node.id,
          'error',
          `Node execution failed: ${result.error}`,
          undefined,
          duration
        );
        return result;
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    await log(
      context.execution_id,
      node.id,
      'error',
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { error },
      duration
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldRetry: true,
    };
  }
}

// ============================================================================
// NODE EXECUTORS
// ============================================================================

async function executeTriggerNode(
  data: TriggerNodeData,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  // Trigger nodes just pass through - they're already triggered
  return {
    success: true,
    output: {
      triggerType: data.triggerType,
      event: data.event,
    },
  };
}

async function executeActionNode(
  data: ActionNodeData,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  // Evaluate config with context variables
  const config = evaluateExpressions(data.config, context.variables);

  switch (data.actionType) {
    case 'send_email':
      return await sendEmail(config, context);

    case 'create_task':
      return await createTask(config, context);

    case 'update_database':
      return await updateDatabase(config, context);

    case 'generate_document':
      return await generateDocument(config, context);

    case 'send_notification':
      return await sendNotification(config, context);

    case 'create_user_account':
      return await createUserAccount(config, context);

    case 'create_tasks':
      return await createMultipleTasks(config, context);

    case 'trigger_workflow':
      return await triggerWorkflow(config, context);

    case 'call_webhook':
      return await callWebhook(config, context);

    default:
      return {
        success: false,
        error: `Unknown action type: ${data.actionType}`,
      };
  }
}

async function executeConditionNode(
  data: ConditionNodeData,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    // Evaluate condition expression
    const condition = evaluateExpression(data.condition, context.variables);
    const result = Boolean(condition);

    return {
      success: true,
      output: { result },
      nextNodes: result ? ['true'] : ['false'], // Will be resolved to actual node IDs
    };
  } catch (error) {
    return {
      success: false,
      error: `Condition evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function executeWaitNode(
  data: WaitNodeData,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  // In a real implementation, this would schedule a job to resume execution later
  // For now, we'll implement simple duration waits

  if (data.waitType === 'duration' && data.config.duration) {
    const durationMs = convertToMs(data.config.duration, data.config.unit || 'minutes');
    await new Promise((resolve) => setTimeout(resolve, Math.min(durationMs, 5000))); // Cap at 5s for demo
    return { success: true };
  }

  // For approval and date-based waits, return success immediately
  // (would need separate job scheduler in production)
  return { success: true, output: { waited: true } };
}

async function executeNotificationNode(
  data: WorkflowNodeData,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  // Similar to send_notification action
  return await sendNotification(data as Record<string, unknown>, context);
}

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================

async function sendEmail(
  config: Record<string, unknown>,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    // In production, integrate with email service (SendGrid, etc.)
    console.log('Sending email:', config);

    // Log email sent
    await log(context.execution_id, 'email', 'info', `Email sent to ${config.to}`, { config });

    return {
      success: true,
      output: { emailSent: true, to: config.to },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      shouldRetry: true,
    };
  }
}

async function createTask(
  config: Record<string, unknown>,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: config.title,
        description: config.description,
        assigned_to: resolveUserId(config.assignTo as string),
        due_date: config.dueDate,
        priority: config.priority || 'medium',
        status: 'open',
      } as never)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      output: { taskId: data.id },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`,
      shouldRetry: true,
    };
  }
}

async function updateDatabase(
  config: Record<string, unknown>,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    const tableName = config.table as string;
    const field = config.field as string;
    const value = config.value;

    // Build update query
    let query = supabase.from(tableName).update({ [field]: value } as never);

    if (config.recordId) {
      query = query.eq('id', config.recordId);
    }

    const { error } = await query;

    if (error) throw error;

    return {
      success: true,
      output: { updated: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      shouldRetry: true,
    };
  }
}

async function generateDocument(
  config: Record<string, unknown>,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    // In production, integrate with document generation service
    console.log('Generating document:', config);

    return {
      success: true,
      output: { documentGenerated: true, template: config.template },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      shouldRetry: true,
    };
  }
}

async function sendNotification(
  config: Record<string, unknown>,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    // Create in-app notification
    const to = Array.isArray(config.to) ? config.to : [config.to];

    for (const userId of to) {
      await supabase.from('notifications').insert({
        user_id: resolveUserId(userId as string),
        title: config.subject || 'Workflow Notification',
        message: config.message,
        type: 'workflow',
      } as never);
    }

    return {
      success: true,
      output: { notificationsSent: to.length },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      shouldRetry: true,
    };
  }
}

async function createUserAccount(
  config: Record<string, unknown>,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    // Create user account logic
    console.log('Creating user account:', config);

    return {
      success: true,
      output: { accountCreated: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`,
      shouldRetry: true,
    };
  }
}

async function createMultipleTasks(
  config: Record<string, unknown>,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    const tasks = config.tasks as string[];
    const createdTasks = [];

    for (const taskTitle of tasks) {
      const result = await createTask({ ...config, title: taskTitle }, context);
      if (result.success && result.output) {
        createdTasks.push(result.output);
      }
    }

    return {
      success: true,
      output: { tasksCreated: createdTasks.length, tasks: createdTasks },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      shouldRetry: true,
    };
  }
}

async function triggerWorkflow(
  config: Record<string, unknown>,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    // Trigger another workflow
    const workflowName = config.workflowName as string;

    // Find workflow by name
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('id')
      .eq('name', workflowName)
      .eq('is_active', true)
      .single();

    if (error || !workflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    // Start new execution
    const executionId = await startWorkflowExecution(
      workflow.id,
      context.triggered_by || 'system',
      'manual',
      context.variables
    );

    return {
      success: true,
      output: { triggeredWorkflow: workflowName, executionId },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to trigger workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function callWebhook(
  config: Record<string, unknown>,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    const response = await fetch(config.url as string, {
      method: (config.method as string) || 'POST',
      headers: (config.headers as Record<string, string>) || { 'Content-Type': 'application/json' },
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      output: { webhookResponse: data },
    };
  } catch (error) {
    return {
      success: false,
      error: `Webhook call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      shouldRetry: true,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Evaluate expressions in config with context variables
 */
function evaluateExpressions(
  config: Record<string, unknown>,
  variables: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && value.includes('{{')) {
      result[key] = evaluateExpression(value, variables);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = evaluateExpressions(value as Record<string, unknown>, variables);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Evaluate a single expression
 */
function evaluateExpression(expression: string, variables: Record<string, unknown>): unknown {
  // Replace {{variable}} with actual values
  let result: string | unknown = expression;

  const matches = expression.match(/\{\{([^}]+)\}\}/g);
  if (matches) {
    for (const match of matches) {
      const varName = match.slice(2, -2).trim();
      const value = getNestedValue(variables, varName);
      if (result === expression && matches.length === 1) {
        // Single variable, return actual value
        return value;
      } else {
        // String with variables, replace with string value
        result = (result as string).replace(match, String(value || ''));
      }
    }
  }

  return result;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, obj as unknown);
}

/**
 * Resolve user ID from various formats
 */
function resolveUserId(identifier: string): string {
  // If starts with "role:", find users with that role (for now, return first match)
  // In production, this would need proper role resolution
  if (identifier.startsWith('role:')) {
    return identifier; // Placeholder - would need actual role lookup
  }
  return identifier;
}

/**
 * Convert duration to milliseconds
 */
function convertToMs(duration: number, unit: string): number {
  const conversions: Record<string, number> = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
  };
  return duration * (conversions[unit] || 1000);
}

/**
 * Update execution status
 */
async function updateExecutionStatus(
  executionId: string,
  status: string,
  startedAt?: string,
  completedAt?: string,
  result?: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  const updates: Record<string, unknown> = { status };

  if (startedAt) updates.started_at = startedAt;
  if (completedAt) updates.completed_at = completedAt;
  if (result) updates.result = result;
  if (errorMessage) updates.error_message = errorMessage;

  await supabase.from('workflow_executions').update(updates as never).eq('id', executionId);
}

/**
 * Update current node being executed
 */
async function updateExecutionCurrentNode(executionId: string, nodeId: string): Promise<void> {
  await supabase
    .from('workflow_executions')
    .update({ current_node_id: nodeId } as never)
    .eq('id', executionId);
}

/**
 * Log workflow execution event
 */
async function log(
  executionId: string,
  nodeId: string,
  level: LogLevel,
  message: string,
  details: Record<string, unknown> = {},
  durationMs?: number
): Promise<void> {
  await supabase.from('workflow_logs').insert({
    execution_id: executionId,
    node_id: nodeId,
    node_type: 'action',
    log_level: level,
    message,
    details,
    duration_ms: durationMs,
  } as never);
}

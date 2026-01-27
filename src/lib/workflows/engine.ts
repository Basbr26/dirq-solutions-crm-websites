/**
 * Workflow Execution Engine
 * Core engine for executing workflows with graph traversal
 */

import { supabase } from '@/integrations/supabase/client';
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowContext,
  WorkflowExecution,
  WorkflowLog,
  ExecutionStatus,
  WorkflowExecutionOptions,
} from './types';
import { createContext, storeNodeOutput } from './context';
import { executeNode } from './executors';

// ============================================================================
// WORKFLOW ENGINE
// ============================================================================

export class WorkflowEngine {
  /**
   * Execute a workflow from start to finish
   */
  static async executeWorkflow(
    workflowId: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<{ success: boolean; execution_id?: string; error?: string }> {
    try {
      console.log(`[Workflow Engine] Starting workflow: ${workflowId}`);

      // Load workflow definition
      const workflow = await this.loadWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Create execution record
      const executionId = await this.createExecution(workflowId, options);
      
      // Create context
      const context = createContext(workflowId, executionId, options);

      // Execute workflow
      await this.runWorkflow(workflow, context);

      console.log(`[Workflow Engine] Workflow completed: ${executionId}`);

      return {
        success: true,
        execution_id: executionId,
      };
    } catch (error: any) {
      console.error('[Workflow Engine] Execution failed:', error);
      return {
        success: false,
        error: error.message || 'Workflow execution failed',
      };
    }
  }

  /**
   * Resume a paused workflow execution (after wait node)
   */
  static async resumeWorkflow(
    executionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[Workflow Engine] Resuming workflow: ${executionId}`);

      // Load execution
      const { data: execution, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (error || !execution) {
        throw new Error(`Execution not found: ${executionId}`);
      }

      if (execution.status !== 'waiting') {
        throw new Error(`Cannot resume execution with status: ${execution.status}`);
      }

      // Load workflow
      const workflow = await this.loadWorkflow(execution.workflow_id);
      if (!workflow) {
        throw new Error(`Workflow not found: ${execution.workflow_id}`);
      }

      // Restore context
      const context = execution.context as WorkflowContext;

      // Continue from current node
      const currentNodeId = execution.current_node_id;
      if (!currentNodeId) {
        throw new Error('No current node ID in execution');
      }

      // Find next node after wait
      const nextNode = this.findNextNode(workflow, currentNodeId);
      if (nextNode) {
        await this.executeFromNode(workflow, context, nextNode.id);
      }

      // Mark as completed
      await this.completeExecution(executionId);

      console.log(`[Workflow Engine] Workflow resumed: ${executionId}`);

      return { success: true };
    } catch (error: any) {
      console.error('[Workflow Engine] Resume failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to resume workflow',
      };
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Load workflow definition from database
   */
  private static async loadWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error || !data) {
      console.error('Failed to load workflow:', error);
      return null;
    }

    return data.nodes as WorkflowDefinition;
  }

  /**
   * Create execution record in database
   */
  private static async createExecution(
    workflowId: string,
    options: WorkflowExecutionOptions
  ): Promise<string> {
    const context = createContext(workflowId, '', options);

    const { data, error } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        status: 'pending',
        context: context as any,
        triggered_by: options.user_id || null,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Failed to create execution record');
    }

    // Update context with execution ID
    context.execution_id = data.id;

    // Update execution with context
    await supabase
      .from('workflow_executions')
      .update({ context: context as any })
      .eq('id', data.id);

    return data.id;
  }

  /**
   * Run workflow from start
   */
  private static async runWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<void> {
    // Update execution status to running
    await supabase
      .from('workflow_executions')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', context.execution_id);

    // Find trigger node (starting point)
    const triggerNode = workflow.nodes.find(n => n.type === 'trigger');
    if (!triggerNode) {
      throw new Error('Workflow has no trigger node');
    }

    // Execute from trigger
    await this.executeFromNode(workflow, context, triggerNode.id);

    // Mark as completed (if not waiting)
    const { data: execution } = await supabase
      .from('workflow_executions')
      .select('status')
      .eq('id', context.execution_id)
      .single();

    if (execution?.status !== 'waiting') {
      await this.completeExecution(context.execution_id);
    }
  }

  /**
   * Execute workflow starting from a specific node
   */
  private static async executeFromNode(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    startNodeId: string
  ): Promise<void> {
    let currentNodeId: string | null = startNodeId;

    while (currentNodeId) {
      const node = workflow.nodes.find(n => n.id === currentNodeId);
      if (!node) {
        console.error(`Node not found: ${currentNodeId}`);
        break;
      }

      // Update current node in execution
      await supabase
        .from('workflow_executions')
        .update({ 
          current_node_id: currentNodeId,
          context: context as any,
        })
        .eq('id', context.execution_id);

      // Execute node
      const result = await this.executeNodeWithLogging(node, context);

      if (!result.success) {
        // Node failed, mark execution as failed
        await this.failExecution(context.execution_id, result.error);
        throw new Error(result.error || 'Node execution failed');
      }

      // Check if we should wait
      if (result.should_wait && result.wait_until) {
        await this.pauseExecution(context.execution_id, currentNodeId, result.wait_until);
        break; // Stop execution, will resume later
      }

      // Store output in context
      if (result.output) {
        storeNodeOutput(context, node.id, result.output);
      }

      // Get next node
      if (result.next_node_id) {
        // Condition node specified next node
        currentNodeId = result.next_node_id;
      } else {
        // Follow edges
        const nextNode = this.findNextNode(workflow, currentNodeId);
        currentNodeId = nextNode?.id || null;
      }
    }
  }

  /**
   * Execute a node and log the execution
   */
  private static async executeNodeWithLogging(
    node: WorkflowNode,
    context: WorkflowContext
  ): Promise<any> {
    const startTime = Date.now();

    // Log node start
    const logId = await this.logNodeStart(context.execution_id, node);

    try {
      // Execute node
      const result = await executeNode(node, context);

      // Log node completion
      await this.logNodeComplete(
        logId,
        result.output,
        result.success,
        result.error,
        Date.now() - startTime
      );

      return result;
    } catch (error: any) {
      // Log node failure
      await this.logNodeComplete(
        logId,
        null,
        false,
        error.message,
        Date.now() - startTime
      );

      throw error;
    }
  }

  /**
   * Find next node following edges
   */
  private static findNextNode(
    workflow: WorkflowDefinition,
    currentNodeId: string
  ): WorkflowNode | null {
    const edge = workflow.edges.find(e => e.source === currentNodeId);
    if (!edge) {
      return null;
    }

    return workflow.nodes.find(n => n.id === edge.target) || null;
  }

  /**
   * Complete execution
   */
  private static async completeExecution(executionId: string): Promise<void> {
    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId);
  }

  /**
   * Fail execution
   */
  private static async failExecution(executionId: string, error?: string): Promise<void> {
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        error: error || 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId);
  }

  /**
   * Pause execution for wait node
   */
  private static async pauseExecution(
    executionId: string,
    currentNodeId: string,
    waitUntil: Date
  ): Promise<void> {
    await supabase
      .from('workflow_executions')
      .update({
        status: 'waiting',
        current_node_id: currentNodeId,
        resume_at: waitUntil.toISOString(),
      })
      .eq('id', executionId);
  }

  /**
   * Log node start
   */
  private static async logNodeStart(
    executionId: string,
    node: WorkflowNode
  ): Promise<string> {
    const { data, error } = await supabase
      .from('workflow_logs')
      .insert({
        execution_id: executionId,
        node_id: node.id,
        node_type: node.type,
        status: 'started',
        input: node.config,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Failed to log node start:', error);
      return '';
    }

    return data.id;
  }

  /**
   * Log node completion
   */
  private static async logNodeComplete(
    logId: string,
    output: any,
    success: boolean,
    error: string | undefined,
    durationMs: number
  ): Promise<void> {
    if (!logId) return;

    await supabase
      .from('workflow_logs')
      .update({
        status: success ? 'completed' : 'failed',
        output: output,
        error: error,
        duration_ms: durationMs,
      })
      .eq('id', logId);
  }
}

// Export convenience functions
export async function executeWorkflow(
  workflowId: string,
  options?: WorkflowExecutionOptions
): Promise<{ success: boolean; execution_id?: string; error?: string }> {
  return WorkflowEngine.executeWorkflow(workflowId, options);
}

export async function resumeWorkflow(
  executionId: string
): Promise<{ success: boolean; error?: string }> {
  return WorkflowEngine.resumeWorkflow(executionId);
}

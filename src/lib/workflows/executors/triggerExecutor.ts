/**
 * Workflow Executors - Trigger Node
 * Validate trigger conditions (entry point for workflow)
 */

import { WorkflowNode, WorkflowContext, ExecutionResult, NodeExecutor } from '../types';

export class TriggerNodeExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: WorkflowContext
  ): Promise<ExecutionResult> {
    try {
      console.log(`[Workflow] Processing trigger node: ${node.id}`, node.config);

      // Trigger nodes don't perform actions, they just validate entry conditions
      // The actual triggering is handled by the workflow engine or event listeners

      // Store trigger data in context if not already there
      if (!context.trigger_data || Object.keys(context.trigger_data).length === 0) {
        context.trigger_data = node.config || {};
      }

      return {
        success: true,
        output: {
          trigger_type: node.config.event || 'manual',
          triggered_at: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error(`[Workflow] Trigger node ${node.id} failed:`, error);
      return {
        success: false,
        error: error.message || 'Trigger validation failed',
      };
    }
  }
}

/**
 * Workflow Executors - Action Node
 * Execute action nodes (send email, create task, etc.)
 */

import { WorkflowNode, WorkflowContext, ExecutionResult, NodeExecutor, ActionConfig } from '../types';
import { executeAction } from '../actions';
import { storeNodeOutput } from '../context';

export class ActionNodeExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: WorkflowContext
  ): Promise<ExecutionResult> {
    try {
      console.log(`[Workflow] Executing action node: ${node.id}`, node.config);

      // Execute the action
      const result = await executeAction(node.config as ActionConfig, context);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Action failed',
        };
      }

      // Store action output in context for use in subsequent nodes
      if (result.output) {
        storeNodeOutput(context, node.id, result.output);
      }

      return {
        success: true,
        output: result.output,
      };
    } catch (error: any) {
      console.error(`[Workflow] Action node ${node.id} failed:`, error);
      return {
        success: false,
        error: error.message || 'Action execution failed',
      };
    }
  }
}

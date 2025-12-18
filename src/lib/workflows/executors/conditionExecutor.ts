/**
 * Workflow Executors - Condition Node
 * Evaluate conditions and branch workflow execution
 */

import { WorkflowNode, WorkflowContext, ExecutionResult, NodeExecutor, ConditionConfig } from '../types';
import { evaluateCondition } from '../context';

export class ConditionNodeExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: WorkflowContext
  ): Promise<ExecutionResult> {
    try {
      console.log(`[Workflow] Evaluating condition node: ${node.id}`, node.config);

      const config = node.config as ConditionConfig;

      // Evaluate the condition
      const conditionMet = evaluateCondition(
        config.field,
        config.operator,
        config.value,
        context
      );

      console.log(`[Workflow] Condition result: ${conditionMet}`);

      // Determine next node based on condition result
      const nextNodeId = conditionMet ? node.trueBranch : node.falseBranch;

      if (!nextNodeId) {
        // No branch defined, continue normally
        return {
          success: true,
          output: { condition_result: conditionMet },
        };
      }

      return {
        success: true,
        output: { condition_result: conditionMet },
        next_node_id: nextNodeId,
      };
    } catch (error: any) {
      console.error(`[Workflow] Condition node ${node.id} failed:`, error);
      return {
        success: false,
        error: error.message || 'Condition evaluation failed',
      };
    }
  }
}

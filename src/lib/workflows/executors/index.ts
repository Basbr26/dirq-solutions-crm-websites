/**
 * Workflow Executors - Index
 * Export all node executors
 */

import { WorkflowNode, WorkflowContext, ExecutionResult } from '../types';
import { TriggerNodeExecutor } from './triggerExecutor';
import { ActionNodeExecutor } from './actionExecutor';
import { ConditionNodeExecutor } from './conditionExecutor';
import { WaitNodeExecutor } from './waitExecutor';

// ============================================================================
// EXECUTOR REGISTRY
// ============================================================================

const executors = {
  trigger: new TriggerNodeExecutor(),
  action: new ActionNodeExecutor(),
  condition: new ConditionNodeExecutor(),
  wait: new WaitNodeExecutor(),
};

/**
 * Execute a workflow node based on its type
 */
export async function executeNode(
  node: WorkflowNode,
  context: WorkflowContext
): Promise<ExecutionResult> {
  const executor = executors[node.type];

  if (!executor) {
    return {
      success: false,
      error: `Unknown node type: ${node.type}`,
    };
  }

  return executor.execute(node, context);
}

// Export individual executors for direct use
export {
  TriggerNodeExecutor,
  ActionNodeExecutor,
  ConditionNodeExecutor,
  WaitNodeExecutor,
};

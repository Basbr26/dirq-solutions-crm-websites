/**
 * Workflow Executors - Wait Node
 * Pause workflow execution for a duration or until a date
 */

import { WorkflowNode, WorkflowContext, ExecutionResult, NodeExecutor, WaitConfig } from '../types';
import { parseDuration, resolveVariable } from '../context';

export class WaitNodeExecutor implements NodeExecutor {
  async execute(
    node: WorkflowNode,
    context: WorkflowContext
  ): Promise<ExecutionResult> {
    try {
      console.log(`[Workflow] Processing wait node: ${node.id}`, node.config);

      const config = node.config as WaitConfig;
      let waitUntil: Date;

      if (config.duration) {
        // Wait for a duration (e.g., '1h', '2d')
        const durationMs = parseDuration(config.duration);
        waitUntil = new Date(Date.now() + durationMs);
      } else if (config.until) {
        // Wait until a specific date/time
        const untilValue = resolveVariable(config.until, context);
        waitUntil = new Date(untilValue);
        
        if (isNaN(waitUntil.getTime())) {
          throw new Error(`Invalid date for wait: ${config.until}`);
        }
      } else if (config.until_field) {
        // Wait until a field in context has a value
        const fieldValue = resolveVariable(config.until_field, context);
        
        if (fieldValue) {
          // Field has value, continue immediately
          return {
            success: true,
            output: { waited: false, reason: 'field_has_value' },
          };
        } else {
          // Field doesn't have value yet, wait 1 hour and check again
          waitUntil = new Date(Date.now() + 60 * 60 * 1000);
        }
      } else {
        throw new Error('Wait node requires duration, until, or until_field config');
      }

      console.log(`[Workflow] Wait node will resume at: ${waitUntil.toISOString()}`);

      return {
        success: true,
        output: { wait_until: waitUntil.toISOString() },
        should_wait: true,
        wait_until: waitUntil,
      };
    } catch (error: any) {
      console.error(`[Workflow] Wait node ${node.id} failed:`, error);
      return {
        success: false,
        error: error.message || 'Wait node configuration failed',
      };
    }
  }
}

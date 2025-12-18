/**
 * Workflow Execution Engine Types
 */

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'wait';
  label?: string;
  config: Record<string, any>;
  trueBranch?: string; // For condition nodes
  falseBranch?: string; // For condition nodes
}

export interface WorkflowEdge {
  source: string;
  target: string;
}

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

export interface WorkflowContext {
  workflow_id: string;
  execution_id: string;
  trigger_data: Record<string, any>;
  variables: Record<string, any>;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  next_node_id?: string; // For branching
  should_wait?: boolean;
  wait_until?: Date;
}

// ============================================================================
// NODE EXECUTORS
// ============================================================================

export interface NodeExecutor {
  execute(
    node: WorkflowNode,
    context: WorkflowContext
  ): Promise<ExecutionResult>;
}

// ============================================================================
// TRIGGER CONFIGS
// ============================================================================

export interface TriggerConfig {
  event?: string; // e.g., 'employee.created', 'contract.expiring'
  table?: string; // Database table to watch
  filters?: Record<string, any>;
  schedule?: string; // Cron expression
}

// ============================================================================
// ACTION CONFIGS
// ============================================================================

export type ActionType =
  | 'send_email'
  | 'send_notification'
  | 'send_bulk_notification'
  | 'create_task'
  | 'update_task'
  | 'complete_task'
  | 'update_record'
  | 'create_record'
  | 'delete_record'
  | 'call_webhook'
  | 'run_query';

export interface ActionConfig {
  action: ActionType;
  [key: string]: any;
}

export interface EmailActionConfig extends ActionConfig {
  action: 'send_email';
  to: string | string[];
  template: string;
  subject?: string;
  variables?: Record<string, any>;
}

export interface NotificationActionConfig extends ActionConfig {
  action: 'send_notification';
  user_id: string | string[];
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  link?: string;
}

export interface TaskActionConfig extends ActionConfig {
  action: 'create_task';
  title: string;
  description?: string;
  assigned_to: string;
  due_date?: string;
  case_id?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface DatabaseActionConfig extends ActionConfig {
  action: 'update_record' | 'create_record' | 'delete_record';
  table: string;
  data?: Record<string, any>;
  filters?: Record<string, any>;
  record_id?: string;
}

export interface WebhookActionConfig extends ActionConfig {
  action: 'call_webhook';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, any>;
}

// ============================================================================
// CONDITION CONFIGS
// ============================================================================

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_null'
  | 'is_not_null'
  | 'in'
  | 'not_in';

export interface ConditionConfig {
  field: string;
  operator: ConditionOperator;
  value?: any;
}

// ============================================================================
// WAIT CONFIGS
// ============================================================================

export interface WaitConfig {
  duration?: string; // e.g., '1h', '2d', '1w'
  until?: string; // ISO date string or variable
  until_field?: string; // Wait until a field has a value
}

// ============================================================================
// EXECUTION STATES
// ============================================================================

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: ExecutionStatus;
  started_at: Date;
  completed_at?: Date;
  created_at: Date;
  current_node_id?: string;
  context: WorkflowContext;
  error?: string;
  resume_at?: Date;
}

// ============================================================================
// EXECUTION LOG
// ============================================================================

export interface WorkflowLog {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  status: 'started' | 'completed' | 'failed';
  input?: any;
  output?: any;
  error?: string;
  duration_ms?: number;
  created_at: Date;
}

// ============================================================================
// SCHEDULE
// ============================================================================

export interface WorkflowSchedule {
  id: string;
  workflow_id: string;
  cron_expression: string;
  enabled: boolean;
  last_run?: Date;
  next_run?: Date;
  timezone?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

export interface WorkflowExecutionOptions {
  trigger_data?: Record<string, any>;
  user_id?: string;
  metadata?: Record<string, any>;
}

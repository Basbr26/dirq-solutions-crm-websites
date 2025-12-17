/**
 * Workflow Automation Engine Types
 */

import type { Node, Edge } from '@xyflow/react';

// ============================================================================
// NODE TYPES
// ============================================================================

export type NodeType = 'trigger' | 'action' | 'condition' | 'wait' | 'notification';

export type TriggerType = 'manual' | 'event' | 'schedule';
export type ActionType =
  | 'send_email'
  | 'create_task'
  | 'update_database'
  | 'call_webhook'
  | 'generate_document'
  | 'send_notification'
  | 'create_user_account'
  | 'create_tasks'
  | 'trigger_workflow'
  | 'create_review'
  | 'iterate';

export type WaitType = 'duration' | 'until_date' | 'approval';

// ============================================================================
// NODE DATA INTERFACES
// ============================================================================

export interface TriggerNodeData extends Record<string, unknown> {
  label: string;
  triggerType: TriggerType;
  event?: string; // e.g., 'employee.status_hired', 'sick_leave.day_42_reached'
  schedule?: string; // cron expression
  cron?: string;
  config?: Record<string, unknown>;
}

export interface ActionNodeData extends Record<string, unknown> {
  label: string;
  actionType: ActionType;
  config: Record<string, unknown>;
}

export interface ConditionNodeData extends Record<string, unknown> {
  label: string;
  condition: string; // JavaScript expression, e.g., "{{employee.age}} > 55"
  trueLabel?: string;
  falseLabel?: string;
}

export interface WaitNodeData extends Record<string, unknown> {
  label: string;
  waitType: WaitType;
  config: {
    duration?: number;
    unit?: 'minutes' | 'hours' | 'days' | 'weeks';
    untilDate?: string; // ISO date or expression like "{{contract.end_date}}"
    approver?: string; // user_id or "role:hr"
    timeout?: number; // days
  };
}

export interface NotificationNodeData extends Record<string, unknown> {
  label: string;
  to: string | string[]; // user_id, email, or "role:hr"
  subject?: string;
  message: string;
  channels?: ('email' | 'in_app' | 'sms')[];
}

// Union type for all node data
export type WorkflowNodeData =
  | TriggerNodeData
  | ActionNodeData
  | ConditionNodeData
  | WaitNodeData
  | NotificationNodeData;

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export interface WorkflowDefinition {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  variables?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  created_by: string;
  category: 'onboarding' | 'offboarding' | 'verzuim' | 'contract' | 'performance' | 'other';
  is_active: boolean;
  is_template: boolean;
  version: number;
  parent_workflow_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_version: number;
  triggered_by?: string;
  trigger_type: TriggerType;
  trigger_event?: string;
  input_data: Record<string, unknown>;
  context: Record<string, unknown>; // Variables and state during execution
  status: ExecutionStatus;
  current_node_id?: string;
  result: Record<string, unknown>;
  error_message?: string;
  retry_count: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface WorkflowLog {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  log_level: LogLevel;
  message: string;
  details: Record<string, unknown>;
  duration_ms?: number;
  created_at: string;
}

// ============================================================================
// WORKFLOW TEMPLATES
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  definition: WorkflowDefinition;
  icon?: string;
  tags: string[];
  is_system: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WORKFLOW SCHEDULES
// ============================================================================

export interface WorkflowSchedule {
  id: string;
  workflow_id: string;
  cron_expression: string;
  timezone: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ACTION CONFIGURATIONS
// ============================================================================

export interface SendEmailConfig {
  to: string | string[];
  template?: string;
  subject?: string;
  body?: string;
  cc?: string[];
  bcc?: string[];
}

export interface CreateTaskConfig {
  title: string;
  description?: string;
  assignTo: string; // user_id or "role:hr"
  dueDate?: string; // ISO date or expression
  priority?: 'low' | 'medium' | 'high';
  labels?: string[];
}

export interface UpdateDatabaseConfig {
  table: string;
  recordId?: string;
  field: string;
  value: unknown;
  condition?: string;
}

export interface CallWebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeout?: number; // seconds
}

export interface GenerateDocumentConfig {
  template: string;
  outputFormat?: 'pdf' | 'docx' | 'html';
  data?: Record<string, unknown>;
  saveTo?: string; // storage path
}

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

export interface ExecutionContext {
  execution_id: string;
  workflow_id: string;
  triggered_by?: string;
  input_data: Record<string, unknown>;
  variables: Record<string, unknown>; // User-defined variables during execution
  currentNode?: string;
  startedAt: Date;
  retryCount: number;
}

// ============================================================================
// NODE EXECUTION RESULT
// ============================================================================

export interface NodeExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  nextNodes?: string[]; // For conditional branching
  shouldRetry?: boolean;
  retryAfter?: number; // seconds
}

// ============================================================================
// WORKFLOW BUILDER STATE
// ============================================================================

export interface WorkflowBuilderState {
  workflow: Workflow | null;
  selectedNode: Node<WorkflowNodeData> | null;
  isModified: boolean;
  isSaving: boolean;
  isExecuting: boolean;
}

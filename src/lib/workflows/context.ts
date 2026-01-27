/**
 * Workflow Context Manager
 * Resolves template variables like {{employee.email}} from context data
 */

import { WorkflowContext } from './types';

// ============================================================================
// VARIABLE RESOLUTION
// ============================================================================

/**
 * Resolve template variables in a string
 * Example: "Hello {{employee.voornaam}}" => "Hello John"
 */
export function resolveTemplate(
  template: string,
  context: WorkflowContext
): string {
  if (!template || typeof template !== 'string') {
    return template;
  }

  // Match {{variable.path}}
  const regex = /\{\{([^}]+)\}\}/g;
  
  return template.replace(regex, (match, path) => {
    const value = resolveVariable(path.trim(), context);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Resolve a variable path from context
 * Example: "employee.email" => context.variables.employee.email
 */
export function resolveVariable(
  path: string,
  context: WorkflowContext
): any {
  // Special variables
  if (path === 'execution_id') return context.execution_id;
  if (path === 'workflow_id') return context.workflow_id;
  if (path === 'user_id') return context.user_id;
  if (path === 'trigger_data') return context.trigger_data;

  // Try trigger_data first (for event data)
  const triggerValue = getNestedValue(context.trigger_data, path);
  if (triggerValue !== undefined) return triggerValue;

  // Then try variables (for stored data)
  const variableValue = getNestedValue(context.variables, path);
  if (variableValue !== undefined) return variableValue;

  // Try metadata
  const metadataValue = getNestedValue(context.metadata, path);
  if (metadataValue !== undefined) return metadataValue;

  return undefined;
}

/**
 * Get nested object value by dot-notation path
 * Example: getNestedValue({a: {b: {c: 123}}}, 'a.b.c') => 123
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Set nested object value by dot-notation path
 * Example: setNestedValue({}, 'a.b.c', 123) => {a: {b: {c: 123}}}
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Resolve all template variables in an object recursively
 */
export function resolveObject(
  obj: any,
  context: WorkflowContext
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return resolveTemplate(obj, context);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveObject(item, context));
  }

  if (typeof obj === 'object') {
    const resolved: any = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveObject(value, context);
    }
    return resolved;
  }

  return obj;
}

/**
 * Store output from a node in context
 */
export function storeNodeOutput(
  context: WorkflowContext,
  nodeId: string,
  output: any
): void {
  if (!context.variables) {
    context.variables = {};
  }

  // Store under node ID for reference
  context.variables[nodeId] = output;

  // Also merge into variables if output is an object
  if (output && typeof output === 'object' && !Array.isArray(output)) {
    context.variables = {
      ...context.variables,
      ...output,
    };
  }
}

/**
 * Create initial context for workflow execution
 */
export function createContext(
  workflowId: string,
  executionId: string,
  options: {
    trigger_data?: Record<string, any>;
    user_id?: string;
    metadata?: Record<string, any>;
  } = {}
): WorkflowContext {
  return {
    workflow_id: workflowId,
    execution_id: executionId,
    trigger_data: options.trigger_data || {},
    variables: {},
    user_id: options.user_id,
    metadata: options.metadata,
  };
}

/**
 * Evaluate a condition using context variables
 */
export function evaluateCondition(
  field: string,
  operator: string,
  value: any,
  context: WorkflowContext
): boolean {
  const fieldValue = resolveVariable(field, context);

  switch (operator) {
    case 'equals':
      return fieldValue == value;
    
    case 'not_equals':
      return fieldValue != value;
    
    case 'contains':
      return String(fieldValue).includes(String(value));
    
    case 'not_contains':
      return !String(fieldValue).includes(String(value));
    
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    
    case 'less_than':
      return Number(fieldValue) < Number(value);
    
    case 'is_null':
      return fieldValue === null || fieldValue === undefined;
    
    case 'is_not_null':
      return fieldValue !== null && fieldValue !== undefined;
    
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    
    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue);
    
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Parse duration string to milliseconds
 * Examples: '1h' => 3600000, '2d' => 172800000, '30m' => 1800000
 */
export function parseDuration(duration: string): number {
  const regex = /^(\d+)([smhdw])$/;
  const match = duration.match(regex);

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  const multipliers: Record<string, number> = {
    s: 1000,              // seconds
    m: 60 * 1000,         // minutes
    h: 60 * 60 * 1000,    // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
  };

  return value * multipliers[unit];
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Workflow Actions - Database Operations
 * CRUD operations via workflow actions
 */

import { supabase } from '@/integrations/supabase/client';
import { DatabaseActionConfig, WorkflowContext } from '../types';
import { resolveObject } from '../context';

// ============================================================================
// DATABASE ACTIONS
// ============================================================================

export async function executeCreateRecord(
  config: DatabaseActionConfig,
  context: WorkflowContext
): Promise<{ success: boolean; record?: any; error?: string }> {
  try {
    const resolved = resolveObject(config, context) as DatabaseActionConfig;

    if (!resolved.table || !resolved.data) {
      throw new Error('Table and data are required for create_record');
    }

    const { data, error } = await supabase
      .from(resolved.table)
      .insert(resolved.data)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      record: data,
    };
  } catch (error: any) {
    console.error('Error creating record:', error);
    return {
      success: false,
      error: error.message || 'Failed to create record',
    };
  }
}

export async function executeUpdateRecord(
  config: DatabaseActionConfig,
  context: WorkflowContext
): Promise<{ success: boolean; record?: any; error?: string }> {
  try {
    const resolved = resolveObject(config, context) as DatabaseActionConfig;

    if (!resolved.table || !resolved.data) {
      throw new Error('Table and data are required for update_record');
    }

    let query = supabase.from(resolved.table).update(resolved.data);

    // Apply filters
    if (resolved.record_id) {
      query = query.eq('id', resolved.record_id);
    } else if (resolved.filters) {
      for (const [field, value] of Object.entries(resolved.filters)) {
        query = query.eq(field, value);
      }
    } else {
      throw new Error('Either record_id or filters are required for update_record');
    }

    const { data, error } = await query.select().single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      record: data,
    };
  } catch (error: any) {
    console.error('Error updating record:', error);
    return {
      success: false,
      error: error.message || 'Failed to update record',
    };
  }
}

export async function executeDeleteRecord(
  config: DatabaseActionConfig,
  context: WorkflowContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const resolved = resolveObject(config, context) as DatabaseActionConfig;

    if (!resolved.table) {
      throw new Error('Table is required for delete_record');
    }

    let query = supabase.from(resolved.table).delete();

    // Apply filters
    if (resolved.record_id) {
      query = query.eq('id', resolved.record_id);
    } else if (resolved.filters) {
      for (const [field, value] of Object.entries(resolved.filters)) {
        query = query.eq(field, value);
      }
    } else {
      throw new Error('Either record_id or filters are required for delete_record');
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete record',
    };
  }
}

export async function executeRunQuery(
  config: {
    table: string;
    select?: string;
    filters?: Record<string, any>;
    order_by?: string;
    limit?: number;
  },
  context: WorkflowContext
): Promise<{ success: boolean; records?: any[]; error?: string }> {
  try {
    const resolved = resolveObject(config, context);

    let query = supabase
      .from(resolved.table)
      .select(resolved.select || '*');

    // Apply filters
    if (resolved.filters) {
      for (const [field, value] of Object.entries(resolved.filters)) {
        query = query.eq(field, value);
      }
    }

    // Apply ordering
    if (resolved.order_by) {
      const [field, direction] = resolved.order_by.split(':');
      query = query.order(field, { ascending: direction !== 'desc' });
    }

    // Apply limit
    if (resolved.limit) {
      query = query.limit(resolved.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      success: true,
      records: data || [],
    };
  } catch (error: any) {
    console.error('Error running query:', error);
    return {
      success: false,
      error: error.message || 'Failed to run query',
    };
  }
}

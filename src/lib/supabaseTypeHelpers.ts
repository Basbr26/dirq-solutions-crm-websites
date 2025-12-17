/**
 * Supabase Type Extensions
 * Helper to work with tables not yet in generated types
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// Helper to safely access new tables not in generated types
export function safeFrom<T = any>(
  client: SupabaseClient,
  table: string
) {
  return client.from(table as any) as any;
}

// Helper for RPC calls
export function safeRpc<T = any>(
  client: SupabaseClient,
  fn: string,
  params?: Record<string, any>
) {
  return client.rpc(fn as any, params) as Promise<{ data: T | null; error: any }>;
}

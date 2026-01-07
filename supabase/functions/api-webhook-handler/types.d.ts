/**
 * Type definitions for Deno Edge Function environment
 * This file helps VS Code understand Deno-specific APIs
 */

// Deno namespace for environment variables and testing
declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }
  
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function test(options: { name: string; fn: () => void | Promise<void> }): void;
}

// Supabase types
declare module 'https://esm.sh/@supabase/supabase-js@2.39.3' {
  export * from '@supabase/supabase-js';
}

// Deno HTTP server types
declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string }
  ): void;
}

// Deno testing assertions
declare module 'https://deno.land/std@0.168.0/testing/asserts.ts' {
  export function assertEquals<T>(actual: T, expected: T, msg?: string): void;
  export function assertExists<T>(actual: T | null | undefined, msg?: string): asserts actual is T;
  export function assert(expr: unknown, msg?: string): asserts expr;
  export function assertStrictEquals<T>(actual: T, expected: T, msg?: string): void;
}

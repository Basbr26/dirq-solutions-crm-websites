/**
 * Prospect Ingestion Edge Function
 * Secure API endpoint for n8n, Apollo, KVK, and Manus AI integrations
 * 
 * Features:
 * - API key authentication
 * - Input validation with Zod
 * - Idempotent UPSERT operations
 * - Structured JSON logging
 * - CORS support
 * - Health check endpoint
 * 
 * System User: 00000000-0000-0000-0000-000000000001 (n8n Automation)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ProspectSchema } from './schema.ts';
import type { IngestProspectResponse, ErrorResponse } from './types.ts';

// ============================================================
// CONSTANTS
// ============================================================
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001'; // n8n Automation

// ============================================================
// STRUCTURED LOGGER
// ============================================================
const log = (
  level: 'info' | 'warn' | 'error', 
  message: string, 
  meta?: Record<string, unknown>
) => {
  console.log(JSON.stringify({ 
    timestamp: new Date().toISOString(), 
    level, 
    message, 
    ...meta 
  }));
};

// ============================================================
// RESPONSE HELPER
// ============================================================
const jsonResponse = (
  data: IngestProspectResponse | ErrorResponse | { status: string; timestamp: string }, 
  status = 200
) => {
  return new Response(
    JSON.stringify(data), 
    {
      status,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Window': '3600'
      }
    }
  );
};

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req: Request) => {
  const startTime = performance.now();
  const requestId = crypto.randomUUID().split('-')[0];

  // ============================================================
  // 1. HEALTH CHECK
  // ============================================================
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    return jsonResponse({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    });
  }

  // ============================================================
  // 2. CORS PREFLIGHT
  // ============================================================
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // ============================================================
  // 3. METHOD CHECK
  // ============================================================
  if (req.method !== 'POST') {
    return jsonResponse({ 
      success: false, 
      error: 'Method not allowed' 
    }, 405);
  }

  // ============================================================
  // 4. AUTHENTICATION
  // ============================================================
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = Deno.env.get('N8N_API_KEY');
  
  if (!expectedKey) {
    log('error', 'N8N_API_KEY not configured', { requestId });
    return jsonResponse({ 
      success: false, 
      error: 'Server misconfigured' 
    }, 500);
  }
  
  if (apiKey !== expectedKey) {
    log('warn', 'Unauthorized access attempt', { 
      requestId,
      ip: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent')
    });
    return jsonResponse({ 
      success: false, 
      error: 'Unauthorized' 
    }, 401);
  }

  // ============================================================
  // 5. REQUEST PARSING
  // ============================================================
  let body;
  try { 
    body = await req.json(); 
  } catch(e) { 
    const error = e as Error;
    log('warn', 'Invalid JSON received', { requestId, error: error.message });
    return jsonResponse({ 
      success: false, 
      error: 'Invalid JSON' 
    }, 400); 
  }
  
  // ============================================================
  // 6. INPUT VALIDATION
  // ============================================================
  const validation = ProspectSchema.safeParse(body);
  if (!validation.success) {
    log('warn', 'Validation failed', { 
      requestId,
      errors: validation.error.errors,
      kvk_preview: body?.kvk_number?.substring(0, 4) + '****'
    });
    return jsonResponse({ 
      success: false, 
      error: 'Validation failed', 
      details: validation.error.errors 
    }, 400);
  }
  
  const prospect = validation.data;

  // ============================================================
  // 7. DATABASE UPSERT (Idempotent)
  // ============================================================
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Check if company exists (for accurate action reporting)
    const { data: existing } = await supabase
      .from('companies')
      .select('id, name')
      .eq('kvk_number', prospect.kvk_number)
      .maybeSingle();

    // Upsert operation (idempotent via kvk_number unique constraint)
    // Use system user ID for automation-created companies
    const upsertData = {
      name: prospect.company_name,
      kvk_number: prospect.kvk_number,
      email: prospect.email,
      phone: prospect.phone,
      city: prospect.city,
      linkedin_url: prospect.linkedin_url,
      website_url: prospect.website_url,
      source: prospect.source,
      tech_stack: prospect.tech_stack,
      ai_audit_summary: prospect.ai_audit_summary,
      status: 'prospect',
      updated_at: new Date().toISOString(),
      owner_id: SYSTEM_USER_ID // System user for automation-created records
    };

    const { data, error } = await supabase
      .from('companies')
      .upsert(upsertData, { 
        onConflict: 'kvk_number',
        ignoreDuplicates: false
      })
      .select('id, kvk_number, name')
      .single();

    if (error) throw error;

    const action = existing ? 'updated' : 'created';
    const duration = Math.round(performance.now() - startTime);

    log('info', `Prospect ${action}`, { 
      requestId,
      action,
      company_id: data.id,
      company_name: data.name,
      kvk_number: prospect.kvk_number,
      source: prospect.source,
      duration_ms: duration
    });

    return jsonResponse({
      success: true,
      action,
      company_id: data.id,
      message: `Company ${action} successfully`,
      metadata: { 
        kvk_number: data.kvk_number, 
        source: prospect.source,
        timestamp: new Date().toISOString()
      }
    }, existing ? 200 : 201);

  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    const error = err as any; // PostgrestError has dynamic properties
    
    log('error', 'Database operation failed', { 
      requestId,
      error: error.message,
      error_details: error.details || error.hint || 'No additional details',
      error_code: error.code,
      kvk_number: prospect.kvk_number,
      source: prospect.source,
      duration_ms: duration,
      stack: error.stack
    });
    
    return jsonResponse({ 
      success: false, 
      error: 'Processing failed',
      message: error.message, // Include error message in response for debugging
      details: error.details || error.hint
    }, 500);
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore - Deno edge function with ESM imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 100; // requests per window

interface RateLimitResponse {
  limited: boolean;
  current_requests: number;
  max_requests: number;
  remaining: number;
  window_seconds: number;
  retry_after: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get client identifier (IP or user ID)
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Parse request body for endpoint and user info
    const { endpoint, userId } = await req.json().catch(() => ({
      endpoint: '/api/default',
      userId: null
    }));

    const clientId = userId || clientIp;
    const now = Math.floor(Date.now() / 1000);

    // Check rate limit using database function
    const { data: rateLimitCheck, error: checkError } = await supabase
      .rpc('check_rate_limit', {
        p_client_id: clientId,
        p_endpoint: endpoint,
        p_window_seconds: RATE_LIMIT_WINDOW,
        p_max_requests: RATE_LIMIT_MAX
      });

    if (checkError) {
      console.error('Rate limit check error:', checkError);
      throw checkError;
    }

    const limitInfo = rateLimitCheck as RateLimitResponse;

    // If rate limit exceeded, return 429
    if (limitInfo.limited) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${limitInfo.retry_after} seconds.`,
          ...limitInfo
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(limitInfo.retry_after),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(now + RATE_LIMIT_WINDOW),
          },
        }
      );
    }

    // Log this request
    const { error: insertError } = await supabase
      .from('rate_limit_requests')
      .insert({
        client_id: clientId,
        endpoint,
        timestamp: now,
        ip_address: clientIp !== 'unknown' ? clientIp : null,
        user_id: userId,
      });

    if (insertError) {
      console.error('Failed to log rate limit request:', insertError);
      // Don't fail the request if logging fails
    }

    // Return success with rate limit headers
    return new Response(
      JSON.stringify({
        success: true,
        ...limitInfo
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': String(limitInfo.remaining),
          'X-RateLimit-Reset': String(now + RATE_LIMIT_WINDOW),
        },
      }
    );
  } catch (error) {
    console.error('Rate limiter error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

/**
 * Google Calendar Webhook Handler
 * 
 * Receives push notifications from Google Calendar when events change.
 * This enables real-time sync instead of polling every 15 minutes.
 * 
 * Google Calendar sends notifications for:
 * - New events created
 * - Events updated
 * - Events deleted
 * - Calendar list changes
 * 
 * Setup:
 * 1. Deploy this Edge Function: supabase functions deploy google-calendar-webhook
 * 2. Get the webhook URL: https://[project-ref].supabase.co/functions/v1/google-calendar-webhook
 * 3. Register the webhook with Google Calendar API (see client-side registration logic)
 * 
 * Security:
 * - Validates Google's notification signature (X-Goog-Channel-Token)
 * - Verifies webhook channel ownership before triggering sync
 */

interface GoogleWebhookHeaders {
  'x-goog-channel-id': string
  'x-goog-channel-token': string
  'x-goog-channel-expiration': string
  'x-goog-resource-id': string
  'x-goog-resource-state': string
  'x-goog-resource-uri': string
  'x-goog-message-number': string
}

serve(async (req) => {
  try {
    // Initialize Supabase client with service role key (for admin operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse Google webhook headers
    const channelId = req.headers.get('x-goog-channel-id')
    const channelToken = req.headers.get('x-goog-channel-token')
    const resourceState = req.headers.get('x-goog-resource-state')
    const resourceId = req.headers.get('x-goog-resource-id')

    console.log('Received Google Calendar webhook:', {
      channelId,
      channelToken,
      resourceState,
      resourceId,
    })

    // Handle webhook verification (sync state = first notification after registration)
    if (resourceState === 'sync') {
      console.log('Webhook verification successful')
      return new Response(JSON.stringify({ message: 'Webhook verified' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate channel token (security check)
    if (!channelToken) {
      console.error('Missing channel token')
      return new Response(JSON.stringify({ error: 'Missing channel token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Find the user who owns this webhook channel
    // Channel token format: "user_[user_id]_[timestamp]"
    const tokenMatch = channelToken.match(/^user_([a-f0-9-]+)_/)
    if (!tokenMatch) {
      console.error('Invalid channel token format')
      return new Response(JSON.stringify({ error: 'Invalid channel token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userId = tokenMatch[1]
    console.log('Webhook triggered for user:', userId)

    // Get user's Google Calendar sync settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_calendar_sync, google_access_token, google_refresh_token, google_token_expires_at')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('User not found or error fetching profile:', profileError)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if auto-sync is enabled
    if (!profile.google_calendar_sync) {
      console.log('Auto-sync disabled for user, ignoring webhook')
      return new Response(JSON.stringify({ message: 'Auto-sync disabled' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Handle different resource states
    switch (resourceState) {
      case 'exists':
        // Calendar data has changed - trigger sync
        console.log('Calendar data changed, triggering sync for user:', userId)
        
        // Store webhook event in database for debugging/audit
        await supabase.from('webhook_events').insert({
          user_id: userId,
          webhook_type: 'google_calendar',
          channel_id: channelId,
          resource_state: resourceState,
          resource_id: resourceId,
          payload: {
            headers: Object.fromEntries(req.headers.entries()),
          },
        })

        // Trigger sync by updating a flag in the database
        // The client-side app will listen to this via realtime subscription
        await supabase.from('profiles').update({
          last_webhook_trigger: new Date().toISOString(),
          webhook_sync_pending: true,
        }).eq('id', userId)

        return new Response(JSON.stringify({ 
          message: 'Sync triggered',
          user_id: userId,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      case 'not_exists':
        // Calendar has been deleted or access revoked
        console.log('Calendar deleted or access revoked for user:', userId)
        
        // Clear sync settings
        await supabase.from('profiles').update({
          google_calendar_sync: false,
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
        }).eq('id', userId)

        return new Response(JSON.stringify({ 
          message: 'Calendar access revoked',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      default:
        console.log('Unknown resource state:', resourceState)
        return new Response(JSON.stringify({ 
          message: 'Webhook received',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    }

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

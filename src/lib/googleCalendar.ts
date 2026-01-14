/**
 * Google Calendar API Integration
 * Handles OAuth and sync with Google Calendar
 */

import { logger } from './logger';

// Declare global types for Google APIs
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || window.location.origin;
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let gapi: any = null;
let tokenClient: any = null;

/**
 * Initialize Google API client
 */
export async function initGoogleCalendar(): Promise<boolean> {
  try {
    // Load Google API script if not already loaded
    if (!window.gapi) {
      await loadGoogleScript('https://apis.google.com/js/api.js');
    }
    
    if (!window.google) {
      await loadGoogleScript('https://accounts.google.com/gsi/client');
    }

    gapi = window.gapi;

    // Initialize gapi client
    await new Promise<void>((resolve) => {
      gapi.load('client', async () => {
        await gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        resolve();
      });
    });

    // Initialize token client for OAuth
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: '', // Will be set during sign-in
      redirect_uri: GOOGLE_REDIRECT_URI, // Explicitly set redirect URI
    });

    return true;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'Error initializing Google Calendar' });
    return false;
  }
}

/**
 * Load Google script dynamically
 */
function loadGoogleScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Sign in to Google and get access token
 * Returns full OAuth response including access_token, expires_in, and scope
 */
export async function signInToGoogle(): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
  refresh_token?: string; // Only present in authorization_code flow, not implicit flow
} | null> {
  return new Promise((resolve) => {
    tokenClient.callback = (response: any) => {
      if (response.error) {
        logger.error(new Error(response.error), { context: 'Google sign-in error' });
        resolve(null);
        return;
      }
      
      // Return full response for token storage
      resolve({
        access_token: response.access_token,
        expires_in: response.expires_in || 3600, // Default 1 hour
        scope: response.scope,
        refresh_token: response.refresh_token, // Will be undefined for implicit flow
      });
    };

    if (gapi.client.getToken() === null) {
      // Prompt the user to select a Google Account and ask for consent
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Skip display of account chooser and consent dialog
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

/**
 * Sign out from Google
 */
export function signOutFromGoogle(): void {
  const token = gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
  }
}

/**
 * Check if user is signed in to Google
 */
export function isGoogleSignedIn(): boolean {
  return gapi?.client?.getToken() !== null;
}

/**
 * Fetch events from Google Calendar
 */
export async function fetchGoogleCalendarEvents(
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date
): Promise<any[]> {
  try {
    const request = {
      calendarId,
      timeMin: timeMin?.toISOString() || new Date().toISOString(),
      timeMax: timeMax?.toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 250,
      orderBy: 'startTime',
    };

    const response = await gapi.client.calendar.events.list(request);
    return response.result.items || [];
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'Error fetching Google Calendar events' });
    throw error;
  }
}

/**
 * Create event in Google Calendar
 */
export async function createGoogleCalendarEvent(event: {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: { email: string }[];
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
}): Promise<any> {
  try {
    const response = await gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    return response.result;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'Error creating Google Calendar event' });
    throw error;
  }
}

/**
 * Update event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  eventId: string,
  event: any
): Promise<any> {
  try {
    const response = await gapi.client.calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: event,
    });
    return response.result;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'Error updating Google Calendar event' });
    throw error;
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  try {
    await gapi.client.calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'Error deleting Google Calendar event' });
    throw error;
  }
}

/**
 * Sync local events to Google Calendar
 * Returns array of successfully synced events with their Google IDs
 */
export async function syncToGoogleCalendar(localEvents: any[]): Promise<{
  synced: number;
  errors: number;
  syncedEvents: Array<{ localId: string; googleEventId: string }>;
}> {
  let synced = 0;
  let errors = 0;
  const syncedEvents: Array<{ localId: string; googleEventId: string }> = [];

  for (const event of localEvents) {
    try {
      // Skip if already synced
      if (event.google_event_id) {
        continue;
      }

      const googleEvent = {
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        start: {
          dateTime: event.start_time,
          timeZone: 'Europe/Amsterdam',
        },
        end: {
          dateTime: event.end_time,
          timeZone: 'Europe/Amsterdam',
        },
      };

      const result = await createGoogleCalendarEvent(googleEvent);
      
      // Store mapping for caller to update database
      if (result && result.id) {
        syncedEvents.push({
          localId: event.id,
          googleEventId: result.id,
        });
        synced++;
      }
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), { context: `Error syncing event ${event.id}` });
      errors++;
    }
  }

  return { synced, errors, syncedEvents };
}

/**
 * Sync Google Calendar events to local database
 */
export async function syncFromGoogleCalendar(
  onEventImport: (event: any) => Promise<void>
): Promise<{ imported: number; errors: number }> {
  let imported = 0;
  let errors = 0;

  try {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const threeMonthsAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const googleEvents = await fetchGoogleCalendarEvents(
      'primary',
      threeMonthsAgo,
      threeMonthsAhead
    );

    // Also fetch deleted events to sync deletions
    const deletedEventsRequest = {
      calendarId: 'primary',
      timeMin: threeMonthsAgo.toISOString(),
      timeMax: threeMonthsAhead.toISOString(),
      showDeleted: true,
      singleEvents: true,
      maxResults: 250,
    };
    
    const deletedResponse = await gapi.client.calendar.events.list(deletedEventsRequest);
    const deletedEvents = (deletedResponse.result.items || []).filter((e: any) => e.status === 'cancelled');

    // Process deletions first
    for (const deletedEvent of deletedEvents) {
      try {
        // Delete from local database if it exists
        await onEventImport({
          google_event_id: deletedEvent.id,
          _action: 'delete', // Special flag for deletion
        } as any);
      } catch (error) {
        console.error(`Error deleting event ${deletedEvent.id}:`, error);
        errors++;
      }
    }

    for (const event of googleEvents) {
      try {
        // Convert Google event to local format
        const localEvent = {
          google_event_id: event.id,
          title: event.summary || 'Untitled Event',
          description: event.description || null,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end.dateTime || event.end.date,
          all_day: !event.start.dateTime,
          location: event.location || null,
          event_type: 'meeting',
          color: '#10b981', // Default green color
          // NOTE: is_virtual and meeting_url zijn niet in database schema
          // Wordt tijdelijk opgeslagen in description als het een video call is
        };

        // Als het een video meeting is, voeg URL toe aan description
        const meetingUrl = event.conferenceData?.entryPoints?.find(
          (e: any) => e.entryPointType === 'video'
        )?.uri || event.hangoutLink;
        
        if (meetingUrl && localEvent.description) {
          localEvent.description += `\n\nVideo meeting: ${meetingUrl}`;
        } else if (meetingUrl) {
          localEvent.description = `Video meeting: ${meetingUrl}`;
        }

        await onEventImport(localEvent);
        imported++;
      } catch (error) {
        console.error(`Error importing event ${event.id}:`, error);
        errors++;
      }
    }
  } catch (error) {
    console.error('Error syncing from Google Calendar:', error);
    throw error;
  }

  return { imported, errors };
}

/**
 * Refresh access token using refresh token
 * Uses Supabase Edge Function for security (CLIENT_SECRET blijft server-side)
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      logger.warn('VITE_SUPABASE_URL not configured');
      return null;
    }

    // Call Edge Function voor veilige server-side token refresh
    const response = await fetch(`${supabaseUrl}/functions/v1/google-calendar-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Supabase anon key voor Edge Function auth
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error(new Error(JSON.stringify(error)), { context: 'Token refresh error' });
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
    };
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'Error refreshing access token' });
    return null;
  }
}

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(expiresAt: string): boolean {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  return expiryDate <= fiveMinutesFromNow;
}

/**
 * Register webhook with Google Calendar for push notifications
 * This enables real-time sync instead of 15-minute polling
 * 
 * @param userId - User ID for channel token
 * @param webhookUrl - Public HTTPS URL for webhook endpoint
 * @returns Watch response with channel ID and expiration
 */
export async function registerGoogleCalendarWebhook(
  userId: string,
  webhookUrl?: string
): Promise<{
  channelId: string;
  resourceId: string;
  expiration: string;
} | null> {
  try {
    // Default webhook URL (Supabase Edge Function)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const defaultWebhookUrl = `${supabaseUrl}/functions/v1/google-calendar-webhook`;
    const url = webhookUrl || defaultWebhookUrl;

    // Generate unique channel ID and token
    const channelId = `user_${userId}_${Date.now()}`;
    const channelToken = channelId; // Use same value for simplicity

    logger.debug('Registering Google Calendar webhook:', {
      channelId,
      url,
    });

    // Register watch channel with Google Calendar API
    const response = await gapi.client.calendar.events.watch({
      calendarId: 'primary',
      resource: {
        id: channelId,
        type: 'web_hook',
        address: url,
        token: channelToken,
        // Optional: Set expiration (max 7 days = 604800 seconds)
        // If not set, Google uses maximum allowed time
        params: {
          ttl: '604800', // 7 days in seconds
        },
      },
    });

    logger.debug('Webhook registered successfully:', response.result);

    return {
      channelId: response.result.id,
      resourceId: response.result.resourceId,
      expiration: response.result.expiration,
    };
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'Error registering webhook' });
    return null;
  }
}

/**
 * Stop (unregister) webhook with Google Calendar
 * Call this when user disables auto-sync or signs out
 * 
 * @param channelId - Channel ID from registration
 * @param resourceId - Resource ID from registration
 */
export async function stopGoogleCalendarWebhook(
  channelId: string,
  resourceId: string
): Promise<boolean> {
  try {
    logger.debug('Stopping Google Calendar webhook:', {
      channelId,
      resourceId,
    });

    await gapi.client.calendar.channels.stop({
      resource: {
        id: channelId,
        resourceId: resourceId,
      },
    });

    logger.debug('Webhook stopped successfully');
    return true;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'Error stopping webhook' });
    return false;
  }
}

/**
 * Check if webhook needs renewal (expires within 24 hours)
 * 
 * @param expirationTimestamp - Expiration timestamp in milliseconds
 * @returns true if webhook should be renewed
 */
export function webhookNeedsRenewal(expirationTimestamp: number): boolean {
  const oneDayInMs = 24 * 60 * 60 * 1000;
  return Date.now() > expirationTimestamp - oneDayInMs;
}

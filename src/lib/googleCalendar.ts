/**
 * Google Calendar API Integration
 * Uses direct REST calls — no gapi discovery docs required.
 */

import { logger } from './logger';

declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

let tokenClient: any = null;
let _accessToken: string | null = null;

/** Set/clear the Calendar access token used for all API calls */
export function setCalendarToken(token: string | null) {
  _accessToken = token;
}

/** Helper: authenticated fetch against Calendar REST API */
async function calendarFetch(path: string, options: RequestInit = {}): Promise<any> {
  if (!_accessToken) throw new Error('Geen Calendar access token');
  const resp = await fetch(`${CALENDAR_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${_accessToken}`,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (resp.status === 204) return null;
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Calendar API ${resp.status}: ${JSON.stringify(data)}`);
  return data;
}

function loadGoogleScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google Calendar (loads GIS only — no gapi/discovery doc)
 */
export async function initGoogleCalendar(): Promise<boolean> {
  try {
    if (!window.google?.accounts?.oauth2) {
      await loadGoogleScript('https://accounts.google.com/gsi/client');
    }

    tokenClient = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      ux_mode: 'popup',
      callback: '',
    });

    return true;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'Error initializing Google Calendar',
    });
    return false;
  }
}

/**
 * Sign in via OAuth popup and exchange code for tokens.
 * Sets the module-level access token on success.
 */
export async function signInToGoogle(): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
} | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5 * 60 * 1000);

    tokenClient.callback = async (response: any) => {
      clearTimeout(timeout);
      if (response.error) {
        logger.error(new Error(response.error), { context: 'Google sign-in error' });
        resolve(null);
        return;
      }
      if (response.code) {
        try {
          const tokenResponse = await exchangeCodeForTokens(response.code);
          if (tokenResponse) setCalendarToken(tokenResponse.access_token);
          resolve(tokenResponse);
        } catch (error) {
          logger.error(error instanceof Error ? error : new Error(String(error)), {
            context: 'Token exchange error',
          });
          resolve(null);
        }
      } else {
        const t = {
          access_token: response.access_token,
          expires_in: response.expires_in || 3600,
          scope: response.scope,
          refresh_token: response.refresh_token,
        };
        setCalendarToken(t.access_token);
        resolve(t);
      }
    };

    tokenClient.error_callback = (error: any) => {
      clearTimeout(timeout);
      const type = error?.type ?? '';
      if (type === 'popup_closed' || type === 'popup_blocked_by_browser') {
        resolve(null);
      } else {
        logger.error(new Error(error?.message || String(error)), { context: 'Google OAuth error' });
        resolve(null);
      }
    };

    tokenClient.requestCode();
  });
}

async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
} | null> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-exchange`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ code }),
      }
    );
    if (!response.ok) throw new Error(`Token exchange failed: ${response.statusText}`);
    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
      scope: data.scope,
      refresh_token: data.refresh_token,
    };
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'Error exchanging code for tokens',
    });
    return null;
  }
}

/** Revoke access and clear the module-level token */
export function signOutFromGoogle(): void {
  if (_accessToken) {
    window.google?.accounts?.oauth2?.revoke(_accessToken, () => {});
    _accessToken = null;
  }
}

export function isGoogleSignedIn(): boolean {
  return _accessToken !== null;
}

export async function fetchGoogleCalendarEvents(
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date
): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      showDeleted: 'false',
      singleEvents: 'true',
      maxResults: '250',
      orderBy: 'startTime',
      timeMin: timeMin?.toISOString() || new Date().toISOString(),
    });
    if (timeMax) params.set('timeMax', timeMax.toISOString());
    const data = await calendarFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`
    );
    return data?.items || [];
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'Error fetching Google Calendar events',
    });
    throw error;
  }
}

export async function createGoogleCalendarEvent(event: {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: { email: string }[];
  reminders?: { useDefault: boolean; overrides?: { method: string; minutes: number }[] };
}): Promise<any> {
  try {
    return await calendarFetch('/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'Error creating Google Calendar event',
    });
    throw error;
  }
}

export async function updateGoogleCalendarEvent(eventId: string, event: any): Promise<any> {
  try {
    return await calendarFetch(`/calendars/primary/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'Error updating Google Calendar event',
    });
    throw error;
  }
}

export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  try {
    await calendarFetch(`/calendars/primary/events/${eventId}`, { method: 'DELETE' });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'Error deleting Google Calendar event',
    });
    throw error;
  }
}

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
      if (event.google_event_id) continue;

      const googleEvent = {
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        start: { dateTime: event.start_time, timeZone: 'Europe/Amsterdam' },
        end: { dateTime: event.end_time, timeZone: 'Europe/Amsterdam' },
      };

      const result = await createGoogleCalendarEvent(googleEvent);
      if (result?.id) {
        syncedEvents.push({ localId: event.id, googleEventId: result.id });
        synced++;
      }
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        context: `Error syncing event ${event.id}`,
      });
      errors++;
    }
  }

  return { synced, errors, syncedEvents };
}

export async function syncFromGoogleCalendar(
  onEventImport: (event: any) => Promise<void>
): Promise<{ imported: number; errors: number }> {
  let imported = 0;
  let errors = 0;

  try {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const threeMonthsAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const googleEvents = await fetchGoogleCalendarEvents('primary', threeMonthsAgo, threeMonthsAhead);

    // Fetch deleted events
    const deletedParams = new URLSearchParams({
      showDeleted: 'true',
      singleEvents: 'true',
      maxResults: '250',
      timeMin: threeMonthsAgo.toISOString(),
      timeMax: threeMonthsAhead.toISOString(),
    });
    const deletedData = await calendarFetch(`/calendars/primary/events?${deletedParams}`);
    const deletedEvents = (deletedData?.items || []).filter((e: any) => e.status === 'cancelled');

    for (const deletedEvent of deletedEvents) {
      try {
        await onEventImport({ google_event_id: deletedEvent.id, _action: 'delete' } as any);
      } catch (error) {
        logger.error('Failed to delete Google Calendar event', { eventId: deletedEvent.id, error });
        errors++;
      }
    }

    for (const event of googleEvents) {
      try {
        const localEvent = {
          google_event_id: event.id,
          title: event.summary || 'Untitled Event',
          description: event.description || null,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end.dateTime || event.end.date,
          all_day: !event.start.dateTime,
          location: event.location || null,
          event_type: 'meeting',
          color: '#10b981',
        };

        const meetingUrl =
          event.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri ||
          event.hangoutLink;
        if (meetingUrl) {
          localEvent.description = localEvent.description
            ? `${localEvent.description}\n\nVideo meeting: ${meetingUrl}`
            : `Video meeting: ${meetingUrl}`;
        }

        await onEventImport(localEvent);
        imported++;
      } catch (error) {
        logger.error('Failed to import Google Calendar event', { eventId: event.id, error });
        errors++;
      }
    }
  } catch (error) {
    logger.error('Google Calendar sync failed', { error });
    throw error;
  }

  return { imported, errors };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) { logger.warn('VITE_SUPABASE_URL not configured'); return null; }

    const response = await fetch(`${supabaseUrl}/functions/v1/google-calendar-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error(new Error(JSON.stringify(error)), { context: 'Token refresh error' });
      return null;
    }

    const data = await response.json();
    return { access_token: data.access_token, expires_in: data.expires_in || 3600 };
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'Error refreshing access token',
    });
    return null;
  }
}

export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date(Date.now() + 5 * 60 * 1000);
}

export async function registerGoogleCalendarWebhook(
  userId: string,
  webhookUrl?: string
): Promise<{ channelId: string; resourceId: string; expiration: string } | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const url = webhookUrl || `${supabaseUrl}/functions/v1/google-calendar-webhook`;
    const channelId = `user_${userId}_${Date.now()}`;

    const data = await calendarFetch('/calendars/primary/events/watch', {
      method: 'POST',
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: url,
        token: channelId,
        params: { ttl: '604800' },
      }),
    });

    return {
      channelId: data.id,
      resourceId: data.resourceId,
      expiration: data.expiration,
    };
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'Error registering webhook',
    });
    return null;
  }
}

export async function stopGoogleCalendarWebhook(
  channelId: string,
  resourceId: string
): Promise<boolean> {
  try {
    await calendarFetch('/channels/stop', {
      method: 'POST',
      body: JSON.stringify({ id: channelId, resourceId }),
    });
    return true;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'Error stopping webhook',
    });
    return false;
  }
}

export function webhookNeedsRenewal(expirationTimestamp: number): boolean {
  return Date.now() > expirationTimestamp - 24 * 60 * 60 * 1000;
}

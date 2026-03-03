/**
 * Gmail API Integration
 * Uses direct REST calls — no gapi discovery doc required.
 * Only needs the GIS (google.accounts.oauth2) script for OAuth.
 */

import { logger } from './logger';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1';

let gmailTokenClient: any = null;
// Module-level access token for direct REST calls
let _accessToken: string | null = null;

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  toEmails: string[];
  ccEmails: string[];
  bodyText: string;
  bodyHtml: string;
  snippet: string;
  labels: string[];
  isRead: boolean;
  receivedAt: Date;
  direction: 'inbound' | 'outbound';
}

export interface GmailThread {
  threadId: string;
  subject: string;
  messages: GmailMessage[];
  latestDate: Date;
  snippet: string;
}

/**
 * Initialize Gmail OAuth client — no gapi discovery doc needed.
 * Only loads the GIS script for the OAuth flow.
 */
export async function initGmail(): Promise<boolean> {
  try {
    if (!window.google?.accounts?.oauth2) {
      await loadScript('https://accounts.google.com/gsi/client');
    }

    gmailTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GMAIL_SCOPES,
      callback: '',
    });

    return true;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'initGmail' });
    return false;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      // Already loading — wait for it
      const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
      if (existing.dataset.loaded) { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => { script.dataset.loaded = '1'; resolve(); };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Sign in to Google with Gmail scopes (implicit token flow — no code exchange, no redirect_uri needed).
 */
export async function signInToGmail(): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
} | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5 * 60 * 1000);

    gmailTokenClient.callback = (response: any) => {
      clearTimeout(timeout);
      if (response.error) {
        logger.error(new Error(response.error), { context: 'Gmail sign-in error' });
        resolve(null);
        return;
      }
      _accessToken = response.access_token;
      resolve({
        access_token: response.access_token,
        expires_in: response.expires_in || 3600,
        scope: response.scope,
      });
    };

    gmailTokenClient.error_callback = (error: any) => {
      clearTimeout(timeout);
      const type = error?.type ?? '';
      if (type === 'popup_closed' || type === 'popup_blocked_by_browser') {
        resolve(null);
      } else {
        logger.error(new Error(error?.message || String(error)), { context: 'Gmail OAuth error' });
        resolve(null);
      }
    };

    gmailTokenClient.requestAccessToken();
  });
}

/**
 * Store access token for direct REST calls (called after loading stored token from DB)
 */
export function setGmailToken(accessToken: string, _expiresIn: number) {
  _accessToken = accessToken;
}

/**
 * Attempt a silent token refresh (no popup, uses existing Google session).
 * Returns the new access token, or null if user needs to re-authenticate.
 */
export async function refreshGmailTokenSilently(): Promise<string | null> {
  if (!gmailTokenClient) return null;
  return new Promise((resolve) => {
    gmailTokenClient.callback = (response: any) => {
      if (response.error || !response.access_token) { resolve(null); return; }
      _accessToken = response.access_token;
      resolve(response.access_token);
    };
    gmailTokenClient.error_callback = () => resolve(null);
    try {
      gmailTokenClient.requestAccessToken({ prompt: '' });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Direct REST call to Gmail API using stored access token
 */
async function gmailFetch(path: string, options: RequestInit = {}): Promise<any> {
  if (!_accessToken) throw new Error('Geen Gmail access token — verbind eerst via Instellingen');
  const resp = await fetch(`${GMAIL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${_accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gmail API ${resp.status}: ${text}`);
  }
  return resp.json();
}

/**
 * Fetch inbox threads (grouped by threadId)
 */
export async function fetchInboxThreads(maxResults = 50): Promise<GmailThread[]> {
  try {
    const data = await gmailFetch(`/users/me/threads?maxResults=${maxResults}&labelIds=INBOX`);
    const threads = data.threads || [];
    const fullThreads: GmailThread[] = [];

    for (const t of threads) {
      const thread = await fetchThread(t.id);
      if (thread) fullThreads.push(thread);
    }

    return fullThreads;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'fetchInboxThreads' });
    throw error;
  }
}

/**
 * Fetch a single thread with all messages
 */
export async function fetchThread(threadId: string): Promise<GmailThread | null> {
  try {
    const raw = await gmailFetch(`/users/me/threads/${threadId}?format=full`);
    const messages: GmailMessage[] = (raw.messages || []).map(parseMessage);

    if (messages.length === 0) return null;

    const latest = messages[messages.length - 1];
    return {
      threadId,
      subject: latest.subject || '(geen onderwerp)',
      messages,
      latestDate: latest.receivedAt,
      snippet: raw.snippet || '',
    };
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'fetchThread', threadId });
    return null;
  }
}

/**
 * Mark a message as read
 */
export async function markAsRead(messageId: string): Promise<void> {
  try {
    await gmailFetch(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'markAsRead', messageId });
  }
}

/**
 * Fetch sent messages
 */
export async function fetchSentMessages(maxResults = 20): Promise<GmailMessage[]> {
  try {
    const data = await gmailFetch(`/users/me/messages?maxResults=${maxResults}&labelIds=SENT`);
    const msgs = data.messages || [];
    const results: GmailMessage[] = [];

    for (const m of msgs) {
      const raw = await gmailFetch(`/users/me/messages/${m.id}?format=full`);
      results.push(parseMessage(raw));
    }

    return results;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'fetchSentMessages' });
    throw error;
  }
}

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseMessage(raw: any): GmailMessage {
  const headers: Record<string, string> = {};
  for (const h of (raw.payload?.headers || [])) {
    headers[h.name.toLowerCase()] = h.value;
  }

  const fromRaw = headers['from'] || '';
  const { name: fromName, email: fromEmail } = parseEmailAddress(fromRaw);
  const toEmails = parseEmailList(headers['to'] || '');
  const ccEmails = parseEmailList(headers['cc'] || '');
  const subject = headers['subject'] || '(geen onderwerp)';
  const date = headers['date'] ? new Date(headers['date']) : new Date();

  const { text, html } = extractBody(raw.payload);
  const labels: string[] = raw.labelIds || [];
  const isRead = !labels.includes('UNREAD');
  const direction: 'inbound' | 'outbound' = labels.includes('SENT') ? 'outbound' : 'inbound';

  return {
    id: raw.id,
    threadId: raw.threadId,
    subject,
    fromEmail,
    fromName,
    toEmails,
    ccEmails,
    bodyText: text,
    bodyHtml: html,
    snippet: raw.snippet || '',
    labels,
    isRead,
    receivedAt: date,
    direction,
  };
}

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/) || raw.match(/^(.+)$/);
  if (!match) return { name: '', email: raw };
  if (match[2]) return { name: match[1].trim(), email: match[2].trim() };
  return { name: '', email: match[1].trim() };
}

function parseEmailList(raw: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(e => parseEmailAddress(e.trim()).email).filter(Boolean);
}

function extractBody(payload: any): { text: string; html: string } {
  let text = '';
  let html = '';

  function walk(part: any) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text = decodeBase64(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html = decodeBase64(part.body.data);
    }
    if (part.parts) part.parts.forEach(walk);
  }

  walk(payload);
  return { text, html };
}

function decodeBase64(data: string): string {
  try {
    const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

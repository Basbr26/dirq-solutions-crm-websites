/**
 * Gmail API Integration
 * Handles OAuth and Gmail operations
 */

import { logger } from './logger';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || window.location.origin;
const GMAIL_DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'];
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';

let gmailTokenClient: any = null;

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
 * Initialize Gmail gapi client (loads Gmail discovery doc)
 */
export async function initGmail(): Promise<boolean> {
  try {
    if (!window.gapi) {
      await loadScript('https://apis.google.com/js/api.js');
    }
    if (!window.google) {
      await loadScript('https://accounts.google.com/gsi/client');
    }

    // Load gapi client with Gmail discovery doc
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('gapi.load timeout after 10s')), 10000);
      window.gapi.load('client', async () => {
        clearTimeout(timeout);
        try {
          await window.gapi.client.init({
            apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
            discoveryDocs: GMAIL_DISCOVERY_DOCS,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    // Init token client for Gmail scopes (separate from Calendar)
    gmailTokenClient = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GMAIL_SCOPES,
      ux_mode: 'popup',
      callback: '',
      redirect_uri: GOOGLE_REDIRECT_URI,
    });

    return true;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'initGmail' });
    return false;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Don't double-load
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Sign in to Google with Gmail scopes
 */
export async function signInToGmail(): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
} | null> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Gmail OAuth timeout: geen reactie binnen 5 minuten'));
    }, 5 * 60 * 1000);

    gmailTokenClient.callback = async (response: any) => {
      clearTimeout(timeout);
      if (response.error) {
        logger.error(new Error(response.error), { context: 'Gmail sign-in error' });
        resolve(null);
        return;
      }
      if (response.code) {
        try {
          const tokenResponse = await exchangeGmailCode(response.code);
          resolve(tokenResponse);
        } catch (error) {
          logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'Gmail token exchange' });
          resolve(null);
        }
      } else {
        resolve({
          access_token: response.access_token,
          expires_in: response.expires_in || 3600,
          scope: response.scope,
          refresh_token: response.refresh_token,
        });
      }
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

    gmailTokenClient.requestCode();
  });
}

async function exchangeGmailCode(code: string) {
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
}

/**
 * Set access token on gapi client (used after loading stored token)
 */
export function setGmailToken(accessToken: string, expiresIn: number) {
  window.gapi?.client?.setToken({ access_token: accessToken, expires_in: expiresIn });
}

/**
 * Fetch inbox threads (grouped by threadId)
 */
export async function fetchInboxThreads(maxResults = 50): Promise<GmailThread[]> {
  try {
    const listResp = await window.gapi.client.gmail.users.threads.list({
      userId: 'me',
      maxResults,
      labelIds: ['INBOX'],
    });

    const threads = listResp.result.threads || [];
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
    const resp = await window.gapi.client.gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    const raw = resp.result;
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
 * Parse a raw Gmail API message into GmailMessage
 */
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

  // Outbound if user sent it (SENT label present)
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
  return raw.split(',').map(e => {
    const { email } = parseEmailAddress(e.trim());
    return email;
  }).filter(Boolean);
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
    return decodeURIComponent(
      escape(atob(data.replace(/-/g, '+').replace(/_/g, '/')))
    );
  } catch {
    return '';
  }
}

/**
 * Mark a message as read
 */
export async function markAsRead(messageId: string): Promise<void> {
  try {
    await window.gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: { removeLabelIds: ['UNREAD'] },
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'markAsRead', messageId });
  }
}

/**
 * Fetch sent messages (for outbox view)
 */
export async function fetchSentMessages(maxResults = 20): Promise<GmailMessage[]> {
  try {
    const listResp = await window.gapi.client.gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['SENT'],
    });

    const msgs = listResp.result.messages || [];
    const results: GmailMessage[] = [];

    for (const m of msgs) {
      const resp = await window.gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'full',
      });
      results.push(parseMessage(resp.result));
    }

    return results;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), { context: 'fetchSentMessages' });
    throw error;
  }
}

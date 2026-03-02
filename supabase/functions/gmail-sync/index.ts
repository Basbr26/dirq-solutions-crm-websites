// Supabase Edge Function: Sync Gmail messages + auto-link to CRM contacts/companies

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { user_id } = await req.json();
    if (!user_id) return json({ error: "user_id vereist" }, 400);

    // Fetch tokens
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gmail_access_token, gmail_refresh_token, gmail_token_expires_at, gmail_last_sync")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.gmail_access_token) {
      return json({ error: "Geen Gmail-verbinding" }, 401);
    }

    let accessToken = profile.gmail_access_token;

    // Refresh if needed
    if (profile.gmail_token_expires_at) {
      const expiresAt = new Date(profile.gmail_token_expires_at);
      if (expiresAt <= new Date(Date.now() + 5 * 60 * 1000) && profile.gmail_refresh_token) {
        accessToken = await refreshToken(supabase, user_id, profile.gmail_refresh_token) ?? accessToken;
      }
    }

    // Fetch all contact emails for this user to match against
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, email, company_id")
      .not("email", "is", null);

    const { data: companies } = await supabase
      .from("companies")
      .select("id, email")
      .not("email", "is", null);

    const contactByEmail = new Map<string, { id: string; companyId: string | null }>();
    for (const c of contacts || []) {
      if (c.email) contactByEmail.set(c.email.toLowerCase(), { id: c.id, companyId: c.company_id });
    }

    const companyByEmail = new Map<string, string>();
    for (const c of companies || []) {
      if (c.email) companyByEmail.set(c.email.toLowerCase(), c.id);
    }

    // Fetch recent messages from Gmail
    const query = profile.gmail_last_sync
      ? `after:${Math.floor(new Date(profile.gmail_last_sync).getTime() / 1000)}`
      : "newer_than:30d";

    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("maxResults", "100");
    listUrl.searchParams.set("q", query);

    const listResp = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResp.ok) {
      const err = await listResp.text();
      console.error("Gmail list error:", err);
      return json({ error: "Gmail ophalen mislukt", details: err }, 502);
    }

    const listData = await listResp.json();
    const messageIds: string[] = (listData.messages || []).map((m: any) => m.id);

    let synced = 0;
    let errors = 0;

    for (const msgId of messageIds) {
      try {
        const msgResp = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!msgResp.ok) { errors++; continue; }

        const msg = await msgResp.json();
        const parsed = parseMessage(msg);

        // Auto-link: check from + to addresses against contacts/companies
        let contactId: string | null = null;
        let companyId: string | null = null;

        const allAddresses = [parsed.fromEmail, ...parsed.toEmails, ...parsed.ccEmails];
        for (const addr of allAddresses) {
          const lower = addr.toLowerCase();
          const contact = contactByEmail.get(lower);
          if (contact) {
            contactId = contact.id;
            if (!companyId && contact.companyId) companyId = contact.companyId;
            break;
          }
        }

        if (!companyId) {
          for (const addr of allAddresses) {
            const lower = addr.toLowerCase();
            const cId = companyByEmail.get(lower);
            if (cId) { companyId = cId; break; }
          }
        }

        await supabase.from("gmail_messages").upsert({
          user_id,
          gmail_message_id: parsed.id,
          gmail_thread_id: parsed.threadId,
          subject: parsed.subject,
          from_email: parsed.fromEmail,
          from_name: parsed.fromName,
          to_emails: parsed.toEmails,
          cc_emails: parsed.ccEmails,
          body_text: parsed.bodyText,
          body_html: parsed.bodyHtml,
          direction: parsed.direction,
          labels: parsed.labels,
          is_read: parsed.isRead,
          received_at: parsed.receivedAt,
          contact_id: contactId,
          company_id: companyId,
          synced_at: new Date().toISOString(),
        }, { onConflict: "user_id,gmail_message_id" });

        synced++;
      } catch (err) {
        console.error("Error processing message", msgId, err);
        errors++;
      }
    }

    // Update last sync time
    await supabase
      .from("profiles")
      .update({ gmail_last_sync: new Date().toISOString() })
      .eq("id", user_id);

    return json({ success: true, synced, errors, total: messageIds.length });
  } catch (error) {
    console.error("gmail-sync error:", error);
    return json({ error: "Interne serverfout", message: String(error) }, 500);
  }
});

async function refreshToken(supabase: any, userId: string, refreshToken: string): Promise<string | null> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await supabase
    .from("profiles")
    .update({ gmail_access_token: data.access_token, gmail_token_expires_at: expiresAt })
    .eq("id", userId);
  return data.access_token;
}

function parseMessage(raw: any) {
  const headers: Record<string, string> = {};
  for (const h of (raw.payload?.headers || [])) {
    headers[h.name.toLowerCase()] = h.value;
  }

  const fromRaw = headers["from"] || "";
  const { name: fromName, email: fromEmail } = parseAddr(fromRaw);
  const toEmails = parseAddrList(headers["to"] || "");
  const ccEmails = parseAddrList(headers["cc"] || "");
  const subject = headers["subject"] || "(geen onderwerp)";
  const receivedAt = headers["date"] ? new Date(headers["date"]).toISOString() : new Date().toISOString();

  const { text: bodyText, html: bodyHtml } = extractBody(raw.payload);
  const labels: string[] = raw.labelIds || [];
  const isRead = !labels.includes("UNREAD");
  const direction: "inbound" | "outbound" = labels.includes("SENT") ? "outbound" : "inbound";

  return { id: raw.id, threadId: raw.threadId, subject, fromEmail, fromName, toEmails, ccEmails, bodyText, bodyHtml, labels, isRead, receivedAt, direction };
}

function parseAddr(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/) || raw.match(/^(.+)$/);
  if (!match) return { name: "", email: raw };
  if (match[2]) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "", email: match[1].trim() };
}

function parseAddrList(raw: string): string[] {
  if (!raw) return [];
  return raw.split(",").map(e => parseAddr(e.trim()).email).filter(Boolean);
}

function extractBody(payload: any): { text: string; html: string } {
  let text = "";
  let html = "";
  function walk(part: any) {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) text = decodeB64(part.body.data);
    else if (part.mimeType === "text/html" && part.body?.data) html = decodeB64(part.body.data);
    if (part.parts) part.parts.forEach(walk);
  }
  walk(payload);
  return { text, html };
}

function decodeB64(data: string): string {
  try {
    return decodeURIComponent(escape(atob(data.replace(/-/g, "+").replace(/_/g, "/"))));
  } catch { return ""; }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

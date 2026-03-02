// Supabase Edge Function: Send email via Gmail API
// Keeps OAuth tokens server-side; builds RFC 2822 message and sends via Gmail

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface SendRequest {
  to: string;
  subject: string;
  body: string;
  thread_id?: string;       // For replies
  in_reply_to?: string;     // Message-ID header of parent message
  contact_id?: string;
  company_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Extract and verify JWT — user_id comes from the token, not the request body
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const user_id = user.id;

    const supabase = createClient(supabaseUrl, serviceKey);

    const body: SendRequest = await req.json();
    const { to, subject, body: emailBody, thread_id, in_reply_to, contact_id, company_id } = body;

    if (!to || !subject || !emailBody) {
      return json({ error: "to, subject en body zijn verplicht" }, 400);
    }

    // Fetch user's Gmail tokens
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gmail_access_token, gmail_refresh_token, gmail_token_expires_at")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.gmail_access_token) {
      return json({ error: "Geen geldige Gmail-verbinding gevonden" }, 401);
    }

    let accessToken = profile.gmail_access_token;

    // Refresh token if expired
    if (profile.gmail_token_expires_at) {
      const expiresAt = new Date(profile.gmail_token_expires_at);
      const fiveMin = new Date(Date.now() + 5 * 60 * 1000);
      if (expiresAt <= fiveMin && profile.gmail_refresh_token) {
        accessToken = await refreshToken(supabase, user_id, profile.gmail_refresh_token) ?? accessToken;
      }
    }

    // Fetch user email address for From header
    const profileResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfo = await profileResp.json();
    const fromEmail = userInfo.email || "me";

    // Build RFC 2822 raw email
    const messageParts = [
      `From: ${fromEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
    ];
    if (in_reply_to) {
      messageParts.push(`In-Reply-To: ${in_reply_to}`);
      messageParts.push(`References: ${in_reply_to}`);
    }
    messageParts.push("", emailBody);

    const msgBytes = new TextEncoder().encode(messageParts.join("\r\n"));
    const raw = btoa(String.fromCharCode(...msgBytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send via Gmail API
    const gmailBody: Record<string, string> = { raw };
    if (thread_id) gmailBody.threadId = thread_id;

    const gmailResp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gmailBody),
      }
    );

    if (!gmailResp.ok) {
      const err = await gmailResp.text();
      console.error("Gmail send error:", err);
      return json({ error: "Gmail verzending mislukt", details: err }, 502);
    }

    const sentMessage = await gmailResp.json();

    // Store sent message in gmail_messages
    await supabase.from("gmail_messages").upsert({
      user_id,
      gmail_message_id: sentMessage.id,
      gmail_thread_id: sentMessage.threadId,
      subject,
      from_email: fromEmail,
      to_emails: [to],
      body_html: emailBody,
      direction: "outbound",
      labels: ["SENT"],
      is_read: true,
      received_at: new Date().toISOString(),
      contact_id: contact_id || null,
      company_id: company_id || null,
    }, { onConflict: "user_id,gmail_message_id" });

    return json({ success: true, message_id: sentMessage.id, thread_id: sentMessage.threadId });
  } catch (error) {
    console.error("gmail-send error:", error);
    return json({ error: "Interne serverfout", message: String(error) }, 500);
  }
});

async function refreshToken(supabase: any, userId: string, refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

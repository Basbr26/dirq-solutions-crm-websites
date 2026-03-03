// Edge Function: save-token
// Stores Google Calendar or Gmail OAuth tokens in the profiles table.
//
// Auth strategy:
//   1. Validate the Google access_token via Google's tokeninfo API (proof of real OAuth flow)
//   2. Use the user_id from the request body (provided by the authenticated CRM session)
//   3. Update the profile using the service role key
//
// This avoids the Supabase JWT chain entirely — no COOP/session timing issues.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    const { type, access_token, expires_at, user_id } = body;

    if (!type || !access_token || !expires_at || !user_id) {
      return json({ error: "Missing required fields: type, access_token, expires_at, user_id" }, 400);
    }

    // Validate the Google token via tokeninfo — proves this is a real OAuth flow
    const tokenInfoResp = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(access_token)}`
    );
    const tokenInfo = await tokenInfoResp.json();

    if (!tokenInfoResp.ok || tokenInfo.error) {
      console.error("Google tokeninfo rejected:", JSON.stringify(tokenInfo));
      return json({ error: "Invalid Google access token", details: tokenInfo.error_description }, 401);
    }

    // Update the profile using the user_id from the body
    const supabase = createClient(supabaseUrl, serviceKey);

    let fields: Record<string, unknown>;
    if (type === "google_calendar") {
      fields = {
        google_access_token: access_token,
        google_token_expires_at: expires_at,
        updated_at: new Date().toISOString(),
      };
    } else if (type === "gmail") {
      fields = {
        gmail_access_token: access_token,
        gmail_token_expires_at: expires_at,
        updated_at: new Date().toISOString(),
      };
    } else {
      return json({ error: "Invalid type — use 'google_calendar' or 'gmail'" }, 400);
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", user_id);

    if (updateErr) {
      console.error("save-token update error:", updateErr);
      return json({ error: updateErr.message, details: updateErr.details }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("save-token unexpected error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

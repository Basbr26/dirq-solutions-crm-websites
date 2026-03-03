// Edge Function: save-token
// Stores Google Calendar or Gmail OAuth tokens in the profiles table.
//
// Auth strategy: validate the Google access_token via Google's tokeninfo API.
// This avoids the Supabase JWT chain entirely — the Google token is proof of identity
// (it was just issued by Google for our OAuth client). No COOP/session timing issues.

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

    const { type, access_token, expires_at } = await req.json();
    if (!type || !access_token || !expires_at) {
      return json({ error: "Missing required fields: type, access_token, expires_at" }, 400);
    }

    // Validate the Google token via tokeninfo — most reliable approach,
    // completely independent of the Supabase session chain.
    const tokenInfoResp = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(access_token)}`
    );
    const tokenInfo = await tokenInfoResp.json();

    if (!tokenInfoResp.ok || !tokenInfo.email) {
      console.error("Google tokeninfo rejected:", JSON.stringify(tokenInfo));
      return json({ error: "Google token validation failed" }, 401);
    }

    const googleEmail = tokenInfo.email.toLowerCase();

    // Find the Supabase profile by email (service role bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", googleEmail)
      .single();

    if (profileErr || !profile) {
      console.error(`No profile found for email ${googleEmail}:`, profileErr);
      return json({ error: `Geen profiel gevonden voor ${googleEmail}` }, 404);
    }

    // Update only the token columns — profile row already exists
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
      .eq("id", profile.id);

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

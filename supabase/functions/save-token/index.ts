// Edge Function: save-token
// Stores Google Calendar or Gmail OAuth tokens in the profiles table.
// Uses service role key to bypass RLS — user identity comes from JWT, never from body.

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
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify JWT — user_id comes from the token, never from the body
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

    const { type, access_token, expires_at } = await req.json();
    if (!type || !access_token || !expires_at) {
      return json({ error: "Missing required fields: type, access_token, expires_at" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Build the fields to upsert — include required NOT NULL columns
    const base = {
      id: user.id,
      email: user.email ?? "",
      role: "SUPPORT",
      updated_at: new Date().toISOString(),
    };

    let fields: Record<string, unknown>;
    if (type === "google_calendar") {
      fields = { ...base, google_access_token: access_token, google_token_expires_at: expires_at };
    } else if (type === "gmail") {
      fields = { ...base, gmail_access_token: access_token, gmail_token_expires_at: expires_at };
    } else {
      return json({ error: "Invalid type — use 'google_calendar' or 'gmail'" }, 400);
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(fields, { onConflict: "id" });

    if (error) {
      console.error("save-token upsert error:", error);
      return json({ error: error.message, details: error.details }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("save-token error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

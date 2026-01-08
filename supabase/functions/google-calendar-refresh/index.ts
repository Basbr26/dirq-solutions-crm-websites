// Supabase Edge Function: Google Calendar Token Refresh
// Purpose: Server-side token refresh om CLIENT_SECRET veilig te houden

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface RefreshTokenRequest {
  refresh_token: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { refresh_token } = await req.json() as RefreshTokenRequest;

    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: "refresh_token is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get CLIENT_SECRET from Supabase environment (niet in code!)
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("Missing Google OAuth credentials in Supabase secrets");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Server-side call naar Google OAuth API
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret, // SECRET blijft server-side!
        refresh_token: refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Google token refresh failed:", errorData);
      return new Response(
        JSON.stringify({ error: "Token refresh failed", details: errorData }),
        {
          status: tokenResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenData = await tokenResponse.json() as GoogleTokenResponse;

    // Bereken expiry timestamp (nu + expires_in seconden)
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Return nieuwe access token en expiry
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        expires_at: expiresAt,
        expires_in: tokenData.expires_in,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

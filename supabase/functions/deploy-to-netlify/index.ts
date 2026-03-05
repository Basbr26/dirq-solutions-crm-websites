// deploy-to-netlify — Supabase Edge Function
// Accepts a raw ZIP file and deploys it to Netlify via their Deploy API.
// Returns the hosted HTTPS URL.
//
// Request:  POST, Content-Type: application/zip, Authorization: Bearer <jwt>
// Response: { success: true, url: "https://dirq-preview-xxx.netlify.app" }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const NETLIFY_ACCESS_TOKEN = Deno.env.get('NETLIFY_ACCESS_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  // Verify JWT — user must be authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  // Check token configured
  if (!NETLIFY_ACCESS_TOKEN) {
    console.error('NETLIFY_ACCESS_TOKEN secret not set');
    return json({ success: false, error: 'Netlify not configured — stel NETLIFY_ACCESS_TOKEN in als secret' }, 500);
  }

  // Validate Content-Type
  const contentType = req.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/zip')) {
    return json({ success: false, error: 'Content-Type moet application/zip zijn' }, 400);
  }

  // Read raw ZIP bytes
  let zipBytes: ArrayBuffer;
  try {
    zipBytes = await req.arrayBuffer();
  } catch (err) {
    console.error('Failed to read ZIP body:', err);
    return json({ success: false, error: 'Kon ZIP niet lezen' }, 400);
  }

  if (zipBytes.byteLength === 0) {
    return json({ success: false, error: 'Leeg ZIP-bestand' }, 400);
  }

  if (zipBytes.byteLength > 50 * 1024 * 1024) {
    return json({ success: false, error: 'ZIP groter dan 50 MB' }, 413);
  }

  const netlifyAuth = `Bearer ${NETLIFY_ACCESS_TOKEN}`;

  // Step 1: Create a new Netlify site with a unique name
  const siteName = `dirq-preview-${crypto.randomUUID().slice(0, 8)}`;
  let siteId: string;

  try {
    const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': netlifyAuth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: siteName }),
    });

    if (!siteRes.ok) {
      const err = await siteRes.text();
      console.error('Netlify site creation failed:', siteRes.status, err);
      return json({ success: false, error: `Netlify site aanmaken mislukt (${siteRes.status})` }, 502);
    }

    const siteData = await siteRes.json();
    siteId = siteData.id;
    console.log(`Netlify site created: ${siteId} (${siteData.default_domain})`);
  } catch (err) {
    console.error('Netlify site creation error:', err);
    return json({ success: false, error: 'Netlify verbinding mislukt' }, 502);
  }

  // Step 2: Deploy the ZIP to the site
  try {
    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        method: 'POST',
        headers: {
          'Authorization': netlifyAuth,
          'Content-Type': 'application/zip',
        },
        body: zipBytes,
      },
    );

    if (!deployRes.ok) {
      const err = await deployRes.text();
      console.error('Netlify deploy failed:', deployRes.status, err);
      return json({ success: false, error: `Netlify deploy mislukt (${deployRes.status})` }, 502);
    }

    const deployData = await deployRes.json();
    const hostedUrl: string = deployData.ssl_url || deployData.deploy_ssl_url || deployData.url;

    console.log(`Netlify deploy successful: ${hostedUrl}`);
    return json({ success: true, url: hostedUrl, site_id: siteId });
  } catch (err) {
    console.error('Netlify deploy error:', err);
    return json({ success: false, error: 'Netlify deploy mislukt' }, 502);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

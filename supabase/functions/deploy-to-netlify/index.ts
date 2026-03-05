// deploy-to-netlify — Supabase Edge Function (uses Vercel API internally)
// Accepts a raw ZIP file: either source code (React/Vite/CRA) or a pre-built static site.
// Automatically detects project type, builds if needed, and returns a hosted URL.
//
// Request:  POST, Content-Type: application/zip, Authorization: Bearer <jwt>
// Response: { success: true, url: "https://dirq-preview-xxx.vercel.app", deploy_status: "ready"|"building" }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from 'https://esm.sh/jszip@3.10.1';
import { corsHeaders } from '../_shared/cors.ts';

const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Files/dirs to exclude from deployment
const SKIP_PREFIXES = ['node_modules/', '.git/', '.yarn/', '__pycache__/', 'venv/', '.venv/'];
const SKIP_NAMES = ['.DS_Store', 'Thumbs.db'];

// Common frontend subfolder names (for Emergent-style exports: ProjectName/frontend/...)
const FRONTEND_DIRS = ['frontend', 'client', 'web', 'app'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  // Verify JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ success: false, error: 'Unauthorized' }, 401);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json({ success: false, error: 'Unauthorized' }, 401);

  if (!VERCEL_TOKEN) {
    return json({ success: false, error: 'Vercel niet geconfigureerd — stel VERCEL_TOKEN in als secret' }, 500);
  }

  // Validate Content-Type
  const contentType = req.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/zip')) {
    return json({ success: false, error: 'Content-Type moet application/zip zijn' }, 400);
  }

  // Read ZIP
  let zipBytes: ArrayBuffer;
  try {
    zipBytes = await req.arrayBuffer();
  } catch {
    return json({ success: false, error: 'Kon ZIP niet lezen' }, 400);
  }

  if (zipBytes.byteLength === 0) return json({ success: false, error: 'Leeg ZIP-bestand' }, 400);
  if (zipBytes.byteLength > 50 * 1024 * 1024) return json({ success: false, error: 'ZIP groter dan 50 MB' }, 413);

  // Parse ZIP
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBytes);
  } catch {
    return json({ success: false, error: 'Ongeldig ZIP-bestand' }, 400);
  }

  // Build file map (non-directories only)
  const rawEntries = Object.entries(zip.files).filter(([, v]) => !v.dir);

  // Strip single top-level directory (e.g. "ProjectName/src/..." → "src/...")
  const topDirs = new Set(rawEntries.map(([k]) => k.split('/')[0]));
  let fileMap: Record<string, JSZip.JSZipObject> = {};

  if (topDirs.size === 1) {
    const prefix = [...topDirs][0] + '/';
    for (const [key, obj] of rawEntries) {
      const newKey = key.startsWith(prefix) ? key.slice(prefix.length) : key;
      if (newKey) fileMap[newKey] = obj;
    }
  } else {
    for (const [key, obj] of rawEntries) fileMap[key] = obj;
  }

  // Find the actual build root (handles Emergent exports: ProjectName/frontend/package.json)
  let deployFiles = fileMap;

  if (!fileMap['package.json'] && !fileMap['index.html']) {
    for (const dir of FRONTEND_DIRS) {
      if (fileMap[`${dir}/package.json`]) {
        const prefix = `${dir}/`;
        deployFiles = {};
        for (const [path, obj] of Object.entries(fileMap)) {
          if (path.startsWith(prefix)) deployFiles[path.slice(prefix.length)] = obj;
        }
        console.log(`Project root found in ${dir}/`);
        break;
      }
    }
  }

  // Detect project type
  const isSourceCode = Boolean(deployFiles['package.json']);
  console.log(`Project type: ${isSourceCode ? 'source code' : 'pre-built'}`);

  // Framework + build detection
  let framework: string | null = null;
  let outputDirectory = 'dist';

  if (isSourceCode) {
    try {
      const pkg = JSON.parse(await deployFiles['package.json'].async('text'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['next'])                        { framework = 'nextjs';            outputDirectory = '.next'; }
      else if (deps['vite'])                   { framework = 'vite';              outputDirectory = 'dist'; }
      else if (deps['react-scripts'])          { framework = 'create-react-app'; outputDirectory = 'build'; }
      else if (deps['@craco/craco'] || deps['craco']) { framework = 'create-react-app'; outputDirectory = 'build'; }
      console.log(`Framework: ${framework ?? 'auto'}, outputDir: ${outputDirectory}`);
    } catch (e) {
      console.warn('Could not parse package.json:', e);
    }
  }

  // Filter files
  const filteredFiles = Object.entries(deployFiles).filter(([path]) => {
    if (SKIP_PREFIXES.some(p => path.startsWith(p))) return false;
    const name = path.split('/').pop() ?? '';
    if (SKIP_NAMES.includes(name)) return false;
    return true;
  });

  console.log(`Uploading ${filteredFiles.length} files to Vercel...`);

  // Upload files to Vercel (batches of 10 in parallel)
  const vercelAuth = `Bearer ${VERCEL_TOKEN}`;
  const fileRefs: Array<{ file: string; sha: string; size: number }> = [];
  const BATCH = 10;

  for (let i = 0; i < filteredFiles.length; i += BATCH) {
    const batch = filteredFiles.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async ([filePath, obj]) => {
      const content = await obj.async('arraybuffer');
      const hashBuffer = await crypto.subtle.digest('SHA-1', content);
      const sha = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      const size = content.byteLength;

      const res = await fetch('https://api.vercel.com/v2/files', {
        method: 'POST',
        headers: {
          'Authorization': vercelAuth,
          'Content-Type': 'application/octet-stream',
          'x-now-digest': sha,
          'x-now-size': String(size),
        },
        body: content,
      });

      // 200 = uploaded, 409 = already exists (deduplication) — both are fine
      if (!res.ok && res.status !== 409) {
        throw new Error(`File upload failed for "${filePath}": ${res.status}`);
      }
      return { file: filePath, sha, size };
    }));
    fileRefs.push(...results);
  }

  // Create Vercel deployment
  const name = `dirq-preview-${crypto.randomUUID().slice(0, 8)}`;
  const deployBody: Record<string, unknown> = {
    name,
    files: fileRefs,
    target: 'production',
  };

  if (isSourceCode) {
    // projectSettings is where Vercel actually reads install/build overrides
    const projectSettings: Record<string, string> = {
      installCommand: 'npm install --legacy-peer-deps && npm install ajv@^8 --legacy-peer-deps',
      buildCommand: 'npm run build',
      outputDirectory,
      nodeVersion: '20.x',
    };
    if (framework) projectSettings.framework = framework;
    deployBody.projectSettings = projectSettings;
  }

  console.log('Deploy body (no files):', JSON.stringify({ ...deployBody, files: `[${fileRefs.length} files]` }));

  const deployRes = await fetch('https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1', {
    method: 'POST',
    headers: { 'Authorization': vercelAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify(deployBody),
  });

  if (!deployRes.ok) {
    const errText = await deployRes.text();
    console.error('Vercel deployment failed:', deployRes.status, errText);
    // Include first 300 chars of Vercel error so UI can show it
    const errSnippet = errText.slice(0, 300);
    return json({ success: false, error: `Vercel deploy mislukt (${deployRes.status}): ${errSnippet}` }, 502);
  }

  const deployment = await deployRes.json();
  const deploymentId: string = deployment.id;
  const deploymentUrl = `https://${deployment.url}`;
  console.log(`Deployment created: ${deploymentId} → ${deploymentUrl}`);

  // For source code: poll until build completes (up to 100s, respecting edge function timeout)
  if (isSourceCode) {
    const start = Date.now();
    const TIMEOUT = 100_000;
    const INTERVAL = 5_000;

    while (Date.now() - start < TIMEOUT) {
      await new Promise(r => setTimeout(r, INTERVAL));

      const statusRes = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: { 'Authorization': vercelAuth },
      });

      if (statusRes.ok) {
        const s = await statusRes.json();
        console.log(`Build state: ${s.readyState}`);

        if (s.readyState === 'READY') {
          return json({ success: true, url: `https://${s.url}`, deploy_status: 'ready' });
        }
        if (s.readyState === 'ERROR' || s.readyState === 'CANCELED') {
          return json({ success: false, error: 'Build mislukt. Controleer of het project correct is.' }, 502);
        }
      }
    }

    // Timed out — return URL anyway, Vercel will finish the build
    console.log('Build timed out in edge function, returning early with building status');
    return json({ success: true, url: deploymentUrl, deploy_status: 'building' });
  }

  // Pre-built: live immediately
  return json({ success: true, url: deploymentUrl, deploy_status: 'ready' });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

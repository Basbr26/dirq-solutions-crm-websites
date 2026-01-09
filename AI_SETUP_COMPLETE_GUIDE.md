# 🤖 AI INTEGRATIONS - COMPLETE SETUP GUIDE

**Datum:** 9 januari 2026  
**Versie:** 1.0  
**Scope:** Gemini API, n8n, Apollo.io, Manus AI

---

## 📋 OVERZICHT

Deze guide helpt je bij het volledig inrichten van alle AI-integraties voor Dirq CRM:

| Integration | Doel | Status |
|-------------|------|--------|
| 🤖 **Google Gemini** | AI-powered lead enrichment, audit generation | ⏳ Setup Required |
| 🔄 **n8n** | Workflow automation (KVK scraping, lead routing) | ⏳ Setup Required |
| 🔍 **Apollo.io** | B2B contact enrichment, company data | ⏳ Setup Required |
| 🎥 **Manus AI** | Website video audits, conversion analysis | ⏳ Setup Required |

**Bestaande infrastructuur:**
- ✅ API Gateway (Edge Function): `ingest-prospect` deployed
- ✅ Database Schema: Project Velocity v2.0.1 active
- ✅ CommandBar: AI agent interface ready
- ✅ Webhook Handler: `api-webhook-handler` ready

---

## 🎯 FASE 1: GOOGLE GEMINI API SETUP

### 1A: Google AI Studio Setup

**Stappen:**

1. **Open Google AI Studio**
   - Ga naar: https://aistudio.google.com/

2. **Maak API Key aan**
   - Klik rechtsboven op **"Get API Key"**
   - Klik **"Create API Key in new project"** OF selecteer bestaand project
   - Kopieer de API key (begint met `AIza...`)

3. **Test de API Key** (in browser console of Postman):
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "contents": [{
         "parts": [{
           "text": "Write a company audit for a fictional accounting firm."
         }]
       }]
     }'
   ```

**Expected Output:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "**Audit Report for [Company Name]**\n\n..."
      }]
    }
  }]
}
```

---

### 1B: Supabase Secrets Setup

**Set Gemini API Key als Supabase Secret:**

```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref pdqdrdddgbiiktcwdslv

# Set Gemini API Key
supabase secrets set GEMINI_API_KEY="AIza..."

# Verify
supabase secrets list
```

**Expected Output:**
```
NAME              INSERT_AT
GEMINI_API_KEY    2026-01-09 14:30:00
N8N_API_KEY       2026-01-07 10:15:00
```

---

### 1C: Update Edge Function (ingest-prospect)

**Bestand:** `supabase/functions/ingest-prospect/gemini-enrichment.ts` (NEW)

```typescript
/**
 * Gemini AI Enrichment Module
 * Generates AI audit summaries for companies
 */

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[]
    }
  }[]
}

/**
 * Generate company audit summary using Gemini
 */
export async function generateCompanyAudit(
  companyName: string,
  websiteUrl?: string,
  industry?: string
): Promise<string | null> {
  try {
    const prompt = `
Je bent een business consultant. Genereer een professionele audit voor het volgende bedrijf:

**Bedrijfsnaam:** ${companyName}
**Website:** ${websiteUrl || 'Onbekend'}
**Industrie:** ${industry || 'Onbekend'}

Geef een gestructureerde analyse met:
1. Bedrijfsoverzicht (2-3 zinnen)
2. Website strengths (3 punten)
3. Improvement opportunities (3 punten)
4. Conversion optimization tips (2-3 punten)
5. Geschatte jaarlijkse omzet (range)

Houd het beknopt (max 250 woorden) en actionable.
`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.9
        }
      })
    });

    if (!response.ok) {
      console.error('Gemini API error:', await response.text());
      return null;
    }

    const data: GeminiResponse = await response.json();
    const auditText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return auditText || null;
  } catch (error) {
    console.error('[Gemini Enrichment] Error:', error);
    return null;
  }
}

/**
 * Extract tech stack from website using Gemini
 */
export async function extractTechStack(websiteUrl: string): Promise<string[]> {
  try {
    const prompt = `
Analyseer de volgende website en identificeer de technologie stack:

Website: ${websiteUrl}

Geef een JSON array terug met exacte technologienamen (bijv. ["WordPress", "WooCommerce", "Google Analytics"]).
Maximaal 8 items. Alleen de JSON array, geen extra tekst.
`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200
        }
      })
    });

    if (!response.ok) return [];

    const data: GeminiResponse = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Parse JSON from response
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error('[Tech Stack Extraction] Error:', error);
    return [];
  }
}
```

---

### 1D: Integreer Gemini in ingest-prospect

**Update:** `supabase/functions/ingest-prospect/index.ts`

```typescript
// Add import
import { generateCompanyAudit, extractTechStack } from './gemini-enrichment.ts';

// In the main handler, after creating/updating company:
if (payload.website_url && payload.source === 'n8n_automation') {
  // Trigger async enrichment (don't await to keep response fast)
  generateCompanyAudit(
    payload.company_name,
    payload.website_url,
    payload.industry
  ).then(async (audit) => {
    if (audit) {
      await supabase
        .from('companies')
        .update({ 
          ai_audit_summary: audit,
          ai_enrichment_status: 'completed'
        })
        .eq('id', companyId);
    }
  }).catch(console.error);

  // Extract tech stack
  extractTechStack(payload.website_url).then(async (stack) => {
    if (stack.length > 0) {
      await supabase
        .from('companies')
        .update({ tech_stack: stack })
        .eq('id', companyId);
    }
  }).catch(console.error);
}
```

**Deploy:**
```bash
cd "c:\Dirq apps\dirq-solutions-crmwebsite"
supabase functions deploy ingest-prospect --no-verify-jwt
```

---

## 🔄 FASE 2: N8N WORKFLOW SETUP

### 2A: n8n Installatie

**Optie 1: Cloud (Aanbevolen)**
1. Ga naar https://n8n.io/
2. Klik **"Sign Up"** → Start gratis trial
3. Maak workspace aan: "Dirq CRM Automation"

**Optie 2: Self-Hosted (Docker)**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Open: http://localhost:5678

---

### 2B: Supabase Credentials Setup in n8n

**Stappen:**

1. **Klik rechtsboven op Settings (tandwiel)**
2. **Ga naar "Credentials"**
3. **Klik "Add Credential"**
4. **Zoek "Supabase"**
5. **Vul in:**
   - **Name:** Dirq CRM Database
   - **Host:** `pdqdrdddgbiiktcwdslv.supabase.co`
   - **Service Role Key:** (from Supabase Dashboard → Settings → API)
   - **Region:** `West Europe (eu-west-1)`

**Test Connection** → Should show ✅ Success

---

### 2C: API Key Setup (ingest-prospect)

**In n8n:**

1. **Credentials → Add Credential**
2. **Zoek "Header Auth"**
3. **Vul in:**
   - **Name:** CRM Webhook API Key
   - **Header Name:** `x-api-key`
   - **Header Value:** (use existing key from `.env.webhook`)

**Get existing key:**
```powershell
# In PowerShell
Get-Content .env.webhook | Select-String "WEBHOOK_API_KEY"
```

---

### 2D: Workflow Template #1: "KVK Company Scanner"

**Import deze JSON in n8n:**

```json
{
  "name": "KVK Company Scanner",
  "nodes": [
    {
      "parameters": {
        "url": "https://openkvk.nl/api/v1/kvk/{{$json['kvk_number']}}",
        "method": "GET"
      },
      "name": "Fetch KVK Data",
      "type": "n8n-nodes-base.httpRequest",
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect",
        "method": "POST",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "headerAuth",
        "jsonParameters": true,
        "options": {},
        "bodyParametersJson": "={\n  \"company_name\": \"{{$json['handelsnaam']}}\",\n  \"kvk_number\": \"{{$json['kvkNummer']}}\",\n  \"city\": \"{{$json['plaats']}}\",\n  \"email\": \"info@{{$json['handelsnaam'].toLowerCase().replace(/\\s+/g, '')}}.nl\",\n  \"website_url\": \"https://{{$json['handelsnaam'].toLowerCase().replace(/\\s+/g, '')}}.nl\",\n  \"source\": \"n8n_automation\"\n}"
      },
      "name": "Create Company in CRM",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300]
    },
    {
      "parameters": {
        "triggerOn": "specificOperation",
        "operation": "create",
        "tableName": "companies",
        "additionalFields": {
          "conditions": {
            "conditions": [
              {
                "keyName": "kvk_number",
                "value": "IS NOT NULL"
              }
            ]
          }
        }
      },
      "name": "Watch New Companies",
      "type": "n8n-nodes-base.supabaseTrigger",
      "position": [50, 300]
    }
  ],
  "connections": {
    "Watch New Companies": {
      "main": [[{ "node": "Fetch KVK Data" }]]
    },
    "Fetch KVK Data": {
      "main": [[{ "node": "Create Company in CRM" }]]
    }
  }
}
```

**Activate Workflow:**
- Klik rechtsboven **"Inactive" → "Active"**
- Test: Add company met KVK nummer in CRM → n8n should enrich

---

### 2E: Workflow Template #2: "Apollo Lead Enrichment"

**Prerequisites:**
1. Apollo.io account aanmaken: https://www.apollo.io/
2. API Key ophalen: Settings → API Keys → Generate New Key

**Import in n8n:**

```json
{
  "name": "Apollo Lead Enrichment",
  "nodes": [
    {
      "parameters": {
        "triggerOn": "update",
        "tableName": "companies",
        "additionalFields": {
          "conditions": {
            "conditions": [
              {
                "keyName": "apollo_id",
                "value": "IS NULL"
              },
              {
                "keyName": "website_url",
                "value": "IS NOT NULL"
              }
            ]
          }
        }
      },
      "name": "Watch Company Updates",
      "type": "n8n-nodes-base.supabaseTrigger",
      "position": [50, 300]
    },
    {
      "parameters": {
        "url": "https://api.apollo.io/v1/organizations/enrich",
        "method": "POST",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "apolloApi",
        "jsonParameters": true,
        "bodyParametersJson": "={\n  \"domain\": \"{{$json['website_url']}}\"\n}"
      },
      "name": "Apollo Enrich",
      "type": "n8n-nodes-base.httpRequest",
      "position": [250, 300]
    },
    {
      "parameters": {
        "resource": "companies",
        "operation": "update",
        "id": "={{$json['id']}}",
        "updateFields": {
          "apollo_id": "={{$json['organization']['id']}}",
          "linkedin_url": "={{$json['organization']['linkedin_url']}}",
          "phone": "={{$json['organization']['phone']}}",
          "enrichment_data": "={{JSON.stringify($json['organization'])}}"
        }
      },
      "name": "Update Company in CRM",
      "type": "n8n-nodes-base.supabase",
      "position": [450, 300]
    }
  ],
  "connections": {
    "Watch Company Updates": {
      "main": [[{ "node": "Apollo Enrich" }]]
    },
    "Apollo Enrich": {
      "main": [[{ "node": "Update Company in CRM" }]]
    }
  }
}
```

**Apollo.io Credentials in n8n:**
1. Credentials → Add Credential → HTTP Header Auth
2. **Name:** Apollo.io API
3. **Header Name:** `x-api-key`
4. **Header Value:** (your Apollo API key)

---

## 🔍 FASE 3: APOLLO.IO SETUP

### 3A: Account Aanmaken

1. Ga naar: https://www.apollo.io/
2. Klik **"Start Free Trial"**
3. Vul bedrijfsgegevens in:
   - **Company:** Dirq Solutions
   - **Role:** Founder / Sales
   - **Team Size:** 1-10
4. Bevestig email

---

### 3B: API Key Genereren

1. **Login → Settings (rechtsboven)**
2. **Ga naar "API"**
3. **Klik "Create New Key"**
4. **Name:** "Dirq CRM Integration"
5. **Kopieer de key** (begint met `apollo_...`)

---

### 3C: Test Apollo API

```bash
curl -X POST https://api.apollo.io/v1/organizations/enrich \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_APOLLO_KEY" \
  -d '{
    "domain": "dirq.nl"
  }'
```

**Expected Output:**
```json
{
  "organization": {
    "id": "5f7...",
    "name": "Dirq Solutions",
    "website_url": "https://dirq.nl",
    "linkedin_url": "https://linkedin.com/company/dirq",
    "phone": "+31 ...",
    "estimated_num_employees": 10,
    "industry": "Software Development"
  }
}
```

---

### 3D: Opslaan in Supabase Secrets

```bash
supabase secrets set APOLLO_API_KEY="apollo_..."
```

---

## 🎥 FASE 4: MANUS AI SETUP

### 4A: Account Setup

**Status:** Manus AI is nog in private beta. Alternatieven:

**Optie 1: Wachtlijst (Aanbevolen)**
1. Ga naar: https://www.manus.im/
2. Klik **"Join Waitlist"**
3. Vul in: Use case = "Automated website audits for CRM"

**Optie 2: Alternatief - ScreenshotOne API**
Voor nu kunnen we website screenshots gebruiken:

1. Ga naar: https://screenshotone.com/
2. Sign up → Free tier (100 screenshots/month)
3. API Key ophalen

```bash
# Test screenshot API
curl "https://api.screenshotone.com/take?access_key=YOUR_KEY&url=https://dirq.nl&full_page=true&format=jpg"
```

---

### 4B: Manus AI Webhook Setup (Future)

**Zodra toegang beschikbaar:**

```typescript
// supabase/functions/manus-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req: Request) => {
  const payload = await req.json();
  
  // Manus sends video audit URL
  const { company_id, video_url, audit_summary } = payload;
  
  // Update company in database
  await supabase
    .from('companies')
    .update({
      video_audit_url: video_url,
      ai_audit_summary: audit_summary,
      ai_enrichment_status: 'completed'
    })
    .eq('id', company_id);
    
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 📊 FASE 5: MONITORING & TESTING

### 5A: Test Complete Flow

**Scenario:** KVK nummer → Gemini enrichment → Apollo data → CRM

```bash
# 1. Create company via API
curl -X POST https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "company_name": "Test Accountants BV",
    "kvk_number": "12345678",
    "website_url": "https://example.com",
    "email": "info@example.com",
    "city": "Amsterdam",
    "source": "n8n_automation"
  }'

# 2. Check Supabase logs
supabase functions logs ingest-prospect --follow

# 3. Check n8n execution logs
# → n8n Dashboard → Executions

# 4. Verify in CRM database
# → Companies table → Should have ai_audit_summary filled
```

---

### 5B: Supabase Function Logs

```bash
# Real-time logs
supabase functions logs ingest-prospect --follow

# Filter by error
supabase functions logs ingest-prospect --filter "level=error"

# Last 100 entries
supabase functions logs ingest-prospect --limit 100
```

---

### 5C: n8n Execution Monitor

**In n8n Dashboard:**

1. **Executions (linksbalk)**
2. **Filter:**
   - Status: Failed
   - Workflow: KVK Company Scanner
3. **Klik op failed execution**
4. **Bekijk error details**

**Common Errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Missing/wrong API key | Check `x-api-key` header |
| `422 Unprocessable Entity` | Invalid payload | Check Zod schema |
| `Gemini API quota exceeded` | Rate limit hit | Wait 60s or upgrade plan |
| `Apollo rate limit` | Too many requests | Add delay node in n8n |

---

## 🔐 FASE 6: ENVIRONMENT VARIABLES CHECKLIST

### 6A: Supabase Secrets

```bash
# Verify all secrets are set
supabase secrets list
```

**Required Secrets:**
```
GEMINI_API_KEY              # Google AI Studio API Key
N8N_API_KEY                 # n8n webhook authentication
APOLLO_API_KEY              # Apollo.io enrichment
WEBHOOK_API_KEY             # api-webhook-handler auth
GOOGLE_CLIENT_SECRET        # Google Calendar OAuth
```

---

### 6B: n8n Credentials

**Checklist:**

- [ ] Supabase (Service Role Key)
- [ ] CRM Webhook API Key (Header Auth)
- [ ] Apollo.io API (Header Auth)
- [ ] Google Gemini API (HTTP Request)

---

### 6C: Frontend Environment Variables

**Bestand:** `.env` (local) / Netlify (production)

```env
# Supabase
VITE_SUPABASE_URL=https://pdqdrdddgbiiktcwdslv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Google Calendar
VITE_GOOGLE_CLIENT_ID=330942751588-ejc5nr457h24q5num3fk4sm537uis9hp.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyCrcCatqCpdVJp303SBgUSWH3A7z21l314

# Google Gemini (frontend - optional, voor client-side AI features)
VITE_GEMINI_API_KEY=AIza...  # Only if using Gemini in frontend
```

**⚠️ Security Note:**
- Frontend `VITE_GEMINI_API_KEY` only for non-sensitive operations
- Sensitive AI calls should go through Edge Functions (server-side)

---

## 🚀 FASE 7: DEPLOYMENT CHECKLIST

### Pre-Production

- [ ] All API keys generated and tested
- [ ] Supabase secrets set (`supabase secrets list` shows all)
- [ ] Edge Function deployed (`ingest-prospect` with Gemini integration)
- [ ] n8n workflows active (KVK Scanner, Apollo Enrichment)
- [ ] Test flow executed successfully (see Fase 5A)
- [ ] Error monitoring setup (Supabase logs, n8n executions)

### Production

- [ ] Netlify environment variables updated
- [ ] Google Gemini API quota checked (15 RPM free tier)
- [ ] Apollo.io plan confirmed (100 credits/month free)
- [ ] n8n workflows tested with production data
- [ ] Database RLS policies verified (companies, projects)
- [ ] Audit logging active (check `v_audit_log_with_users`)

---

## 📚 QUICK REFERENCE

### API Endpoints

| Service | Endpoint | Auth Method |
|---------|----------|-------------|
| Ingest Prospect | `https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect` | x-api-key |
| Webhook Handler | `https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/api-webhook-handler` | X-API-Key |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent` | ?key=... |
| Apollo.io | `https://api.apollo.io/v1/organizations/enrich` | x-api-key |

---

### Useful Commands

```bash
# Deploy all Edge Functions
supabase functions deploy --no-verify-jwt

# Watch logs in real-time
supabase functions logs ingest-prospect --follow

# Test Gemini API
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'

# Test n8n webhook (local)
curl -X POST http://localhost:5678/webhook-test/ingest \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Test"}'
```

---

## 🆘 TROUBLESHOOTING

### Gemini API 403 Error

**Cause:** API Key restrictions or billing not enabled  
**Fix:**
1. Go to Google AI Studio → API Keys
2. Check key restrictions
3. Verify billing account linked (if using paid tier)

---

### n8n Workflow Not Triggering

**Cause:** Supabase Trigger not configured correctly  
**Fix:**
1. Check n8n → Credentials → Supabase
2. Verify Service Role Key (NOT Anon Key)
3. Test Connection → Should be green ✅
4. Reactivate workflow

---

### Apollo Rate Limit Exceeded

**Cause:** Free tier limit (25 requests/day)  
**Fix:**
1. Add **"Wait" node** in n8n (5 second delay)
2. Or upgrade to Apollo Growth plan ($49/month)

---

## 📞 NEXT STEPS

**Na deze setup:**

1. **Documentatie lezen:**
   - N8N_DEPLOYMENT_GUIDE.md - Detailed n8n workflows
   - PROJECT_VELOCITY_COMPLETE_GUIDE.md - Database architecture
   - AI_INTEGRATIONS_IMPLEMENTATION.md - Webhook handler details

2. **UI Updates:**
   - Company detail page: Show `ai_audit_summary`
   - Dashboard: Add "AI Enrichment Status" widget
   - Settings: Toggle AI enrichment on/off

3. **Advanced Features:**
   - Scheduled n8n workflows (nightly Apollo enrichment)
   - Gemini-powered lead scoring
   - Automated email campaigns based on AI insights

---

**🎉 Setup Complete!**

Je CRM is nu AI-powered met automatische lead enrichment, KVK data sync, en company audits.

**Questions?** Check deze guides:
- N8N_DEPLOYMENT_GUIDE.md
- PROJECT_VELOCITY_COMPLETE_GUIDE.md
- GOOGLE_CALENDAR_SETUP.md (vergelijkbare setup flow)

---

**END OF GUIDE**

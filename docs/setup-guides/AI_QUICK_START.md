# 🤖 AI INTEGRATIONS - QUICK START

**Status:** ✅ Ready to Deploy  
**Date:** 9 januari 2026  
**Time to Complete:** 15-20 minuten

---

## 🎯 WHAT'S INCLUDED

Je hebt nu alles om de AI integraties te activeren:

✅ **Google Gemini** - AI company audits + tech stack detection  
✅ **Apollo.io** - B2B contact enrichment  
✅ **Manus AI** - Website audit videos (coming soon)  
✅ **Edge Function** - Async AI enrichment pipeline  
✅ **Test Scripts** - Automated testing van de complete flow

---

## 🚀 3-STEP INSTALLATION

### STAP 1: API Keys Setup (5 min)

Run het PowerShell setup script:

```powershell
cd "c:\Dirq apps\dirq-solutions-crmwebsite"
.\AI_KEYS_SETUP.ps1
```

**Wat doet dit script:**
- ✅ Controleert Supabase CLI
- ✅ Configureert alle 3 API keys als Supabase secrets
- ✅ Test elke API key
- ✅ Slaat backup op in `.env.ai`

**Expected Output:**
```
✅ GEMINI_API_KEY configured
✅ APOLLO_API_KEY configured
✅ MANUS_API_KEY configured
✅ All secrets configured successfully!
🎉 AI Keys Setup Complete!
```

---

### STAP 2: Deploy Edge Function (5 min)

Deploy de updated Edge Function met Gemini enrichment:

```powershell
.\DEPLOY_AI_FUNCTION.ps1
```

**Wat doet dit script:**
- ✅ Verifieert dat GEMINI_API_KEY is set
- ✅ Deployed `ingest-prospect` Edge Function
- ✅ Test health endpoint
- ✅ Geeft test commands

**Expected Output:**
```
✅ Edge Function deployed with features:
   • Gemini AI company audits
   • Tech stack extraction
   • Lead scoring (0-100)
   • Async enrichment (non-blocking)
🎉 Deployment Complete!
```

---

### STAP 3: Test AI Enrichment (5 min)

Test de complete AI pipeline:

```powershell
.\TEST_AI_ENRICHMENT.ps1
```

**Wat doet dit script:**
- ✅ Health check
- ✅ Maakt 2 test companies (met/zonder website)
- ✅ Triggert AI enrichment
- ✅ Wacht 10 seconden
- ✅ Geeft verification instructies

**Expected Output:**
```
✅ Tests Completed:
   1. Health check
   2. Company creation (no AI)
   3. Company creation (with AI)
   4. Database verification
   5. Log inspection
🎉 AI Enrichment Tests Complete!
```

---

## ✅ VERIFICATION

### Check Supabase Dashboard

1. Open: https://supabase.com/dashboard/project/pdqdrdddgbiiktcwdslv/editor/companies

2. Zoek de test company: **"Tech Innovators BV"**

3. Verify deze kolommen zijn gevuld:
   - `ai_audit_summary` → 250+ characters structured analysis
   - `tech_stack` → Array: `["React", "TypeScript", ...]`
   - `enrichment_data` → JSON: `{"lead_score": 75, "generated_at": "..."}`
   - `ai_enrichment_status` → `completed`

### Check Logs

```powershell
supabase functions logs ingest-prospect --limit 50
```

**Look for:**
```
[Gemini] Generating audit for: Tech Innovators BV
[Gemini] ✅ Audit generated (234 chars)
[Gemini] Extracting tech stack for: https://...
[Gemini] ✅ Extracted 6 technologies
AI enrichment completed
```

---

## 📚 WHAT'S NEXT?

### Option A: n8n Workflows (Aanbevolen)

Setup automated workflows voor KVK scraping en Apollo enrichment:

1. **Open guide:** `N8N_DEPLOYMENT_GUIDE.md`
2. **Create n8n account:** https://n8n.io/
3. **Import workflows:**
   - KVK Company Scanner
   - Apollo Lead Enrichment
4. **Activate workflows**

**Time:** 30 minuten  
**Result:** Automatische lead enrichment bij elke nieuwe company

---

### Option B: Manual API Testing

Test de API direct via cURL/PowerShell:

```powershell
# Get API key
$apiKey = (Get-Content .env.webhook | Select-String "N8N_API_KEY").ToString().Split("=")[1]

# Create company with AI enrichment
$body = @{
    company_name = "Example Corp"
    kvk_number = "12345678"
    website_url = "https://example.com"
    email = "info@example.com"
    city = "Amsterdam"
    source = "n8n_automation"
    industry = "Software"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{"x-api-key"=$apiKey} `
    -Body $body
```

**Expected Response:**
```json
{
  "success": true,
  "action": "created",
  "company_id": "uuid-here",
  "message": "Company created successfully",
  "metadata": {
    "kvk_number": "12345678",
    "source": "n8n_automation",
    "ai_enrichment": "triggered",
    "timestamp": "2026-01-09T..."
  }
}
```

---

### Option C: Frontend Integration

Show AI enrichment in de UI:

**1. Update CompanyDetailPage.tsx:**

```typescript
// Show AI audit summary
{company.ai_audit_summary && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Brain className="h-5 w-5" />
        AI Business Analyse
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="prose prose-sm">
        {company.ai_audit_summary}
      </div>
      {company.enrichment_data?.lead_score && (
        <div className="mt-4">
          <Badge variant="secondary">
            Lead Score: {company.enrichment_data.lead_score}/100
          </Badge>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

**2. Show tech stack:**

```typescript
{company.tech_stack && company.tech_stack.length > 0 && (
  <div className="flex flex-wrap gap-2">
    {company.tech_stack.map((tech) => (
      <Badge key={tech} variant="outline">
        {tech}
      </Badge>
    ))}
  </div>
)}
```

---

## 🔧 TROUBLESHOOTING

### Error: "GEMINI_API_KEY not configured"

**Fix:**
```powershell
# Set your Gemini API key (get from https://aistudio.google.com/)
supabase secrets set GEMINI_API_KEY="your-gemini-api-key-here"
```

---

### Error: "Unauthorized"

**Fix:** Check API key in request header:
```powershell
# Get correct key
Get-Content .env.webhook | Select-String "N8N_API_KEY"

# Use in request
-Headers @{"x-api-key"="YOUR_KEY_HERE"}
```

---

### AI Enrichment Not Working

**Debug steps:**

1. **Check logs:**
   ```powershell
   supabase functions logs ingest-prospect --follow
   ```

2. **Verify website_url is provided:**
   ```json
   {
     "company_name": "Test",
     "website_url": "https://example.com",  // ← Required for AI
     "source": "n8n_automation"             // ← Required trigger
   }
   ```

3. **Check Gemini API quota:**
   - Free tier: 15 requests/minute
   - Go to: https://aistudio.google.com/

---

### Apollo API 401 Error

**Fix:** Verify API key:
```powershell
# Replace with your actual Apollo API key from https://app.apollo.io/settings/api
curl -X GET https://api.apollo.io/v1/auth/health `
  -H "x-api-key: your-apollo-api-key-here"
```

---

## 📊 MONITORING

### Real-time Logs

```powershell
# Watch all Edge Function activity
supabase functions logs ingest-prospect --follow

# Filter by error
supabase functions logs ingest-prospect --filter "level=error"

# Last 100 entries
supabase functions logs ingest-prospect --limit 100
```

---

### Database Queries

```sql
-- Companies with AI enrichment
SELECT 
  name,
  ai_enrichment_status,
  COALESCE(LENGTH(ai_audit_summary), 0) as audit_length,
  array_length(tech_stack, 1) as tech_count,
  enrichment_data->>'lead_score' as lead_score
FROM companies
WHERE ai_enrichment_status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

-- Average lead score by industry
SELECT 
  industries.name as industry,
  AVG((enrichment_data->>'lead_score')::int) as avg_lead_score,
  COUNT(*) as company_count
FROM companies
LEFT JOIN industries ON companies.industry_id = industries.id
WHERE enrichment_data ? 'lead_score'
GROUP BY industries.name
ORDER BY avg_lead_score DESC;
```

---

## 🎓 API RATE LIMITS

| Service | Free Tier | Rate Limit | Notes |
|---------|-----------|------------|-------|
| **Gemini API** | 15 RPM | 60 requests/min (paid) | Current usage: <1 RPM |
| **Apollo.io** | 100 credits/month | 25 requests/day | Upgrade: $49/month |
| **Manus AI** | TBD | TBD | Private beta |

**Optimization tips:**
- ✅ AI enrichment runs async (doesn't block API response)
- ✅ Only triggered when `website_url` + `source=n8n_automation`
- ✅ Results cached in database (no re-enrichment on updates)

---

## 📖 FULL DOCUMENTATION

- **Complete Setup Guide:** `AI_SETUP_COMPLETE_GUIDE.md` (1000+ regels)
- **n8n Workflows:** `N8N_DEPLOYMENT_GUIDE.md`
- **Database Schema:** `PROJECT_VELOCITY_COMPLETE_GUIDE.md`
- **Code Audit:** `CODE_AUDIT_REPORT.md`

---

## 🔐 SECURITY NOTES

⚠️ **IMPORTANT:**

1. **Never commit `.env.ai` to git**
   - Add to `.gitignore`
   - Contains plaintext API keys

2. **API Keys in Supabase Secrets only**
   - Frontend heeft GEEN toegang
   - Edge Functions server-side only

3. **Rate Limiting**
   - Gemini: 15 RPM free tier
   - Consider upgrading if scaling

---

## ✅ SUCCESS CRITERIA

Je setup is **succesvol** als:

- ✅ `AI_KEYS_SETUP.ps1` runs zonder errors
- ✅ `DEPLOY_AI_FUNCTION.ps1` deploys Edge Function
- ✅ `TEST_AI_ENRICHMENT.ps1` shows green checkmarks
- ✅ Supabase Dashboard toont `ai_audit_summary` filled
- ✅ Logs tonen `[Gemini] ✅ Audit generated`

**Total Time:** 15-20 minuten  
**Result:** Fully operational AI-powered CRM 🚀

---

**Questions?** Check:
- AI_SETUP_COMPLETE_GUIDE.md (detailed walkthrough)
- N8N_DEPLOYMENT_GUIDE.md (workflow automation)
- CODE_AUDIT_REPORT.md (feature verification)

**END OF QUICK START**

# Supabase Deployment Instructies - Finance Outreach

## 📋 Wat moet er gedaan worden?

Er zijn 3 stappen nodig in Supabase:

### 1️⃣ Database Migratie Uitvoeren
### 2️⃣ Edge Function Deployen  
### 3️⃣ Environment Secrets Instellen

---

## 1. Database Migratie

### Optie A: Via Supabase Dashboard (Makkelijkst)
1. Ga naar je Supabase project dashboard
2. Navigeer naar **SQL Editor**
3. Maak een "New Query"
4. Kopieer de inhoud van `supabase/migrations/20260107_finance_outreach_strategy.sql`
5. Plak in SQL Editor en klik **Run**
6. Controleer of er geen errors zijn

### Optie B: Via Supabase CLI
```bash
# Login bij Supabase
supabase login

# Link je lokale project
supabase link --project-ref [your-project-ref]

# Push de migratie
supabase db push

# Of run specifiek deze migratie
supabase migration up --db-url [your-database-url]
```

### Wat doet deze migratie?
✅ Voegt nieuwe interaction types toe: `physical_mail`, `linkedin_video_audit`  
✅ Voegt `website_builder` en `delivery_deadline` kolommen toe aan projects  
✅ Voegt `is_addon` kolom toe aan quote_items  
✅ Maakt index voor snelle outreach queries  
✅ Maakt view `v_weekly_outreach_stats` voor dashboard  
✅ Maakt automatische follow-up trigger voor fysieke kaartjes  

---

## 2. n8n Webhook Edge Function Deployen

### Via Supabase CLI (Aanbevolen)
```bash
# Zorg dat je in de root directory bent
cd "c:\Dirq apps\dirq-solutions-crmwebsite"

# Deploy de edge function
supabase functions deploy n8n-webhook-handler

# Verify deployment
supabase functions list
```

### Via Supabase Dashboard
1. Ga naar **Edge Functions** in sidebar
2. Klik **Deploy new function**
3. Upload de `supabase/functions/n8n-webhook-handler/` folder
4. Function name: `n8n-webhook-handler`
5. Klik **Deploy**

### Test de function
```bash
# Test via curl (vervang [project-ref])
curl -X POST https://[project-ref].supabase.co/functions/v1/n8n-webhook-handler \
  -H "X-Webhook-Secret: test-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "kvk_registration",
    "company_name": "Test Company BV",
    "source": "Manual Test"
  }'
```

---

## 3. Environment Secrets Instellen

### Secrets die nodig zijn:

#### Voor n8n Webhook Handler:
```bash
# Webhook authenticatie secret (genereer een random string)
supabase secrets set N8N_WEBHOOK_SECRET="jouw-random-secret-hier"

# Default user ID voor geautomatiseerde leads (gebruik je admin user ID)
supabase secrets set DEFAULT_LEAD_OWNER_ID="admin-user-uuid-hier"
```

### Hoe vind je je admin user UUID?
1. Ga naar Supabase Dashboard → **Authentication** → **Users**
2. Vind je admin account
3. Kopieer de User UID

### Of via SQL:
```sql
-- Run in SQL Editor
SELECT id, email FROM auth.users WHERE email = 'jouw-admin@email.com';
```

---

## 4. Netlify Environment Variables

⚠️ **Vergeet niet!** De Google Calendar API keys moeten ook in Netlify:

Ga naar Netlify → Site Settings → Environment Variables:

```
VITE_GOOGLE_CLIENT_ID=330942751588-ejc5nr457h24q5num3fk4sm537uis9hp.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyCrcCatqCpdVJp303SBgUSWH3A7z21l314
```

---

## 5. Verificatie

### Check Database Migratie:
```sql
-- Run in SQL Editor

-- 1. Check nieuwe interaction types
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'interactions_type_check';

-- 2. Check nieuwe kolommen in leads (projects)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('website_builder', 'delivery_deadline');

-- 3. Check weekly stats view bestaat
SELECT * FROM v_weekly_outreach_stats LIMIT 5;

-- 4. Test nieuwe interaction types
INSERT INTO interactions (
  company_id, user_id, type, subject
) VALUES (
  (SELECT id FROM companies LIMIT 1),
  (SELECT id FROM profiles LIMIT 1),
  'physical_mail',
  'Test fysiek kaartje'
);

-- Check of follow-up taak is aangemaakt (moet automatisch gebeuren)
SELECT * FROM interactions 
WHERE type = 'task' 
AND subject LIKE 'LinkedIn Follow-up%' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Check Edge Function:
```bash
# View logs
supabase functions logs n8n-webhook-handler

# Test webhook
curl -X POST https://[project-ref].supabase.co/functions/v1/n8n-webhook-handler \
  -H "X-Webhook-Secret: [your-secret]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "kvk_registration",
    "company_name": "Test Finance BV",
    "kvk_number": "12345678",
    "website": "https://testfinance.nl",
    "source": "KVK API Test"
  }'

# Expected response:
# {"success":true,"company_id":"...","message":"Lead successfully processed: Test Finance BV"}
```

---

## 🚨 Troubleshooting

### Migratie Errors

**Error: "constraint already exists"**
```sql
-- Drop oude constraint eerst
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_type_check;
-- Run migratie opnieuw
```

**Error: "column already exists"**
```sql
-- Check of kolom al bestaat
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'website_builder';
-- Skip die specifieke ALTER TABLE als kolom bestaat
```

### Edge Function Errors

**401 Unauthorized**
- Check `N8N_WEBHOOK_SECRET` is correct ingesteld
- Verify header in je request: `X-Webhook-Secret: [your-secret]`

**400 Missing required fields**
- Ensure payload bevat: `company_name`, `type`, `source`

**500 Internal error**
- Check `DEFAULT_LEAD_OWNER_ID` is ingesteld
- Verify user ID bestaat in profiles table
- Check function logs: `supabase functions logs n8n-webhook-handler`

### Netlify Deploy Errors

**Calendar niet syncing**
- Verify Google API keys zijn gezet in Netlify env vars
- Check Google Cloud Console: authorized redirect URIs bevatten Netlify URL

---

## 📝 Checklist

Vink af wat je hebt gedaan:

- [ ] Database migratie uitgevoerd (`20260107_finance_outreach_strategy.sql`)
- [ ] Verificatie queries gedraaid (geen errors)
- [ ] Edge function gedeployed (`n8n-webhook-handler`)
- [ ] `N8N_WEBHOOK_SECRET` ingesteld
- [ ] `DEFAULT_LEAD_OWNER_ID` ingesteld  
- [ ] Google Calendar env vars in Netlify gezet
- [ ] Test interaction aangemaakt met `physical_mail` type
- [ ] Automatische follow-up taak is aangemaakt
- [ ] Webhook endpoint getest met curl/Postman

---

## 🎯 Na Deployment

### Dashboard Widget Toevoegen
De `OutreachTrackerWidget` is gemaakt maar nog niet toegevoegd aan dashboard.

**Voeg toe aan DashboardCRM.tsx:**
```typescript
import { OutreachTrackerWidget } from '@/components/OutreachTrackerWidget';

// In de return statement:
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Existing widgets */}
  <OutreachTrackerWidget />
</div>
```

### n8n Workflow Setup
1. Maak nieuwe workflow in n8n
2. Add HTTP Request node
3. URL: `https://[project-ref].supabase.co/functions/v1/n8n-webhook-handler`
4. Headers: `X-Webhook-Secret: [your-secret]`
5. Body: Map KVK data to payload format (zie README in n8n-webhook-handler folder)

---

## 📚 Extra Resources

- **Finance Outreach Implementation Guide**: [FINANCE_OUTREACH_IMPLEMENTATION.md](../FINANCE_OUTREACH_IMPLEMENTATION.md)
- **n8n Webhook Handler Docs**: [supabase/functions/n8n-webhook-handler/README.md](../supabase/functions/n8n-webhook-handler/README.md)
- **Financial Calculations**: [src/lib/financialCalculations.ts](../src/lib/financialCalculations.ts)
- **Follow-up Automation**: [src/lib/followUpAutomation.ts](../src/lib/followUpAutomation.ts)

---

**Klaar voor deployment!** 🚀

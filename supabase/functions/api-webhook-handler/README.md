# AI Webhook Handler - Integratie Gids

## Overzicht

Deze Edge Function biedt een veilige webhook endpoint voor externe AI-integraties zoals **n8n** en **Manus AI**. De functie valideert payloads, maakt CRM-entiteiten aan, en stuurt automatische notificaties naar sales reps.

## 🔐 Beveiliging

### API Key Setup

1. **Genereer een veilige API key:**
   ```bash
   openssl rand -hex 32
   ```

2. **Stel de secret in via Supabase Dashboard:**
   - Ga naar `Project Settings > Edge Functions > Secrets`
   - Voeg toe: `WEBHOOK_API_KEY` = `[jouw-gegenereerde-key]`

3. **Gebruik de API key in requests:**
   ```
   X-API-Key: [jouw-api-key]
   ```

### Database Security (Updated: Jan 7, 2026)

**RLS Policies Actief:**
- ✅ Edge Function gebruikt `service_role` key voor database toegang
- ✅ Bypassed RLS policies (authorized via API key)
- ✅ Audit logging ingeschakeld voor alle creaties
- ✅ SECURITY DEFINER functions protected met search_path

**Security Hardening:**
- 21 functions fixed met `SET search_path = public, pg_catalog`
- Prevents search_path injection attacks
- See: `supabase/migrations/20260107_rls_security_hardening_fixes.sql`

## 📡 Endpoints

**Base URL:** `https://[project-ref].supabase.co/functions/v1/api-webhook-handler`

### Beschikbare Actions

| Action | Beschrijving | Required Fields |
|--------|-------------|----------------|
| `create_lead` | Maak nieuwe lead (project) aan | `company_name`, `title` |
| `create_company` | Maak nieuw bedrijf aan | `name` |
| `create_contact` | Maak nieuw contact aan | `company_id`, `first_name`, `last_name` |
| `add_note` | Voeg notitie toe aan entiteit | `entity_type`, `entity_id`, `content` |

## 🤖 n8n Integratie

### Setup Stappen

1. **Voeg HTTP Request node toe** aan je workflow
2. **Configureer de node:**

```json
{
  "method": "POST",
  "url": "https://[project-ref].supabase.co/functions/v1/api-webhook-handler",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      },
      {
        "name": "X-API-Key",
        "value": "[jouw-api-key]"
      },
      {
        "name": "User-Agent",
        "value": "n8n-workflow/1.0"
      },
      {
        "name": "X-Client-App",
        "value": "n8n-{{$workflow.name}}"
      }
    ]
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "action",
        "value": "create_lead"
      },
      {
        "name": "data",
        "value": "={{$json}}"
      },
      {
        "name": "source",
        "value": "n8n"
      }
    ]
  }
}
```

### Voorbeeld: Lead Aanmaken via n8n

```json
{
  "action": "create_lead",
  "source": "n8n",
  "data": {
    "company_name": "Acme Corp",
    "title": "Website redesign project",
    "description": "Client wil moderne corporate website met CMS",
    "project_type": "corporate_website",
    "value": 8500,
    "expected_close_date": "2026-02-15",
    "contact_email": "info@acmecorp.nl",
    "contact_name": "John Doe",
    "contact_phone": "+31612345678",
    "priority": "high",
    "tags": ["inbound", "website", "urgent"],
    "source": "Contact formulier"
  },
  "metadata": {
    "workflow_id": "workflow-123",
    "workflow_name": "Contact Form Handler",
    "trigger_timestamp": "2026-01-07T10:30:00Z"
  }
}
```

### n8n Workflow Template

**Use Case:** Contact formulier → Lead in CRM

1. **Webhook Trigger Node**
   - Wacht op POST van contact formulier
   - Capture: naam, email, bericht, bedrijf

2. **Function Node** - Data transformatie
   ```javascript
   return {
     json: {
       action: "create_lead",
       source: "n8n",
       data: {
         company_name: $input.item.json.company,
         title: `Aanvraag van ${$input.item.json.name}`,
         description: $input.item.json.message,
         project_type: "corporate_website",
         value: 5000, // Default estimate
         contact_email: $input.item.json.email,
         contact_name: $input.item.json.name,
         contact_phone: $input.item.json.phone,
         priority: "medium",
         tags: ["contact-form", "inbound"],
         source: "Website contact form"
       }
     }
   };
   ```

3. **HTTP Request Node** - Stuur naar webhook
   - URL: `https://[project-ref].supabase.co/functions/v1/api-webhook-handler`
   - Method: POST
   - Headers: `X-API-Key`, `User-Agent: n8n-workflow/1.0`
   - Body: `{{$json}}`

4. **IF Node** - Check success
   ```javascript
   $json.success === true
   ```

5. **Send Confirmation Email** (optional)
   - Stuur bevestiging naar klant
   - Gebruik Gmail, SendGrid, of Mailgun node

## 🧠 Manus AI Integratie

### Setup in Manus

1. **Configureer HTTP Action:**

```typescript
// Manus AI Tool Configuration
{
  name: "createCrmLead",
  description: "Create a new lead in the CRM system",
  parameters: {
    company_name: { type: "string", required: true },
    title: { type: "string", required: true },
    description: { type: "string" },
    project_type: { 
      type: "string", 
      enum: ["landing_page", "corporate_website", "ecommerce", "web_app", "blog", "portfolio", "custom"]
    },
    value: { type: "number" },
    contact_email: { type: "string" },
    contact_name: { type: "string" }
  },
  http: {
    method: "POST",
    url: "https://[project-ref].supabase.co/functions/v1/api-webhook-handler",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "[jouw-api-key]",
      "User-Agent": "Manus-AI/2.0",
      "X-Client-App": "manus-crm-agent"
    },
    body: {
      action: "create_lead",
      source: "manus",
      data: "{{parameters}}"
    }
  }
}
```

### Voorbeeld: Manus AI Lead Creation

**Prompt aan Manus:**
> "Maak een lead aan voor TechStartup BV. Ze willen een e-commerce website voor hun nieuwe product lijn. Budget is ongeveer €12.000. Contact is Sarah van Marketing, email sarah@techstartup.nl"

**Manus AI Actie:**
```json
{
  "action": "create_lead",
  "source": "manus",
  "data": {
    "company_name": "TechStartup BV",
    "title": "E-commerce website nieuwe productlijn",
    "description": "Client wil e-commerce platform voor nieuwe producten. Contact via Sarah van Marketing.",
    "project_type": "ecommerce",
    "value": 12000,
    "expected_close_date": "2026-03-01",
    "contact_email": "sarah@techstartup.nl",
    "contact_name": "Sarah van Marketing",
    "priority": "medium",
    "tags": ["ecommerce", "manus-created"],
    "source": "Manus AI conversation"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "project_id": "uuid-project-123",
    "company_id": "uuid-company-456",
    "contact_id": "uuid-contact-789",
    "owner_id": "uuid-sales-rep-001",
    "message": "Lead successfully created and assigned"
  },
  "metadata": {
    "action": "create_lead",
    "source": "manus",
    "timestamp": "2026-01-07T10:45:30.123Z"
  }
}
```

## 📊 Notificaties

De webhook stuurt automatisch notificaties naar sales reps:

### Lead Assigned Notificatie
```
🎯 Nieuwe lead toegewezen
Nieuwe lead "Website redesign project" voor Acme Corp (via n8n)
```

**Deep link:** `/projects/{project_id}`

### Detectie in Audit Log

De audit trigger detecteert automatisch de bron via User-Agent:

```sql
SELECT 
  table_name,
  action,
  detected_client_type,
  user_agent,
  created_at
FROM v_audit_log_with_users
WHERE detected_client_type IN ('n8n Workflow', 'Manus AI')
ORDER BY created_at DESC;
```

**Resultaat:**
```
table_name | action | detected_client_type | user_agent           | created_at
-----------|--------|---------------------|---------------------|------------
projects   | INSERT | n8n Workflow        | n8n-workflow/1.0    | 2026-01-07
companies  | INSERT | Manus AI            | Manus-AI/2.0        | 2026-01-07
```

## 🧪 Testing

### cURL Test: Create Lead

```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/api-webhook-handler \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -H "User-Agent: test-client/1.0" \
  -d '{
    "action": "create_lead",
    "source": "test",
    "data": {
      "company_name": "Test Company",
      "title": "Test Project",
      "description": "This is a test lead",
      "project_type": "landing_page",
      "value": 3000,
      "contact_email": "test@example.com",
      "contact_name": "Test User",
      "priority": "low",
      "tags": ["test"]
    }
  }'
```

### Postman Collection

```json
{
  "info": {
    "name": "CRM Webhook API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Lead",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "X-API-Key",
            "value": "{{api_key}}"
          },
          {
            "key": "User-Agent",
            "value": "Postman/1.0"
          }
        ],
        "url": {
          "raw": "{{base_url}}/functions/v1/api-webhook-handler",
          "host": ["{{base_url}}"],
          "path": ["functions", "v1", "api-webhook-handler"]
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"action\": \"create_lead\",\n  \"data\": {\n    \"company_name\": \"Postman Test Co\",\n    \"title\": \"API Integration Project\",\n    \"value\": 5000\n  }\n}"
        }
      }
    },
    {
      "name": "Create Company",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "X-API-Key",
            "value": "{{api_key}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/functions/v1/api-webhook-handler",
          "host": ["{{base_url}}"],
          "path": ["functions", "v1", "api-webhook-handler"]
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"action\": \"create_company\",\n  \"data\": {\n    \"name\": \"New Client Inc\",\n    \"email\": \"info@newclient.com\",\n    \"phone\": \"+31201234567\",\n    \"status\": \"prospect\",\n    \"priority\": \"high\"\n  }\n}"
        }
      }
    }
  ]
}
```

## ⚙️ Deployment

### 1. Deploy Edge Function

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref [your-project-ref]

# Deploy function
supabase functions deploy api-webhook-handler
```

### 2. Set Environment Variables

```bash
# Set API key secret
supabase secrets set WEBHOOK_API_KEY=[your-generated-key]

# Verify secrets
supabase secrets list
```

### 3. Test Deployment

```bash
# Invoke function locally
supabase functions serve api-webhook-handler

# Test with curl (in another terminal)
curl -X POST http://localhost:54321/functions/v1/api-webhook-handler \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{"action": "create_lead", "data": {"company_name": "Test", "title": "Test Lead"}}'
```

## 🔍 Monitoring

### Check Logs

```bash
# Real-time logs
supabase functions logs api-webhook-handler --follow

# Recent errors
supabase functions logs api-webhook-handler --level error
```

### Audit Query

```sql
-- Webhook activiteit laatste 24 uur
SELECT 
  al.created_at,
  al.table_name,
  al.action,
  al.user_agent,
  al.ip_address,
  p.email as executed_by,
  CASE 
    WHEN al.user_agent ILIKE '%manus%' THEN 'Manus AI'
    WHEN al.user_agent ILIKE '%n8n%' THEN 'n8n'
    ELSE 'Other'
  END as source_type
FROM crm_audit_log al
LEFT JOIN profiles p ON al.user_id = p.id
WHERE al.created_at > NOW() - INTERVAL '24 hours'
  AND (al.user_agent ILIKE '%manus%' OR al.user_agent ILIKE '%n8n%')
ORDER BY al.created_at DESC;
```

## 🚨 Error Handling

### Common Errors

| Status | Error | Oplossing |
|--------|-------|-----------|
| 401 | Invalid API key | Check X-API-Key header en secret |
| 400 | Unknown action | Gebruik: create_lead, create_company, create_contact, add_note |
| 400 | Missing required fields | Check payload tegen required fields |
| 500 | Database error | Check Supabase logs en RLS policies |

### Example Error Response

```json
{
  "success": false,
  "error": "Missing required fields: company_name and title are required",
  "details": "Error: Missing required fields: company_name and title are required"
}
```

## 🎯 Best Practices

1. **Rate Limiting**: Implementeer rate limiting in n8n (max 10 requests/minuut)
2. **Idempotency**: Check op duplicates voor je webhook aanroept
3. **Error Handling**: Implementeer retry logic met exponential backoff
4. **Monitoring**: Set up alerts voor failed webhook calls
5. **Security**: Roteer API keys regelmatig (elke 3 maanden)

## 📚 Type Definitions

Voor volledige type safety, zie:
- `src/types/crm.ts` - Alle CRM entity types
- `src/types/projects.ts` - Project/lead types
- `supabase/functions/api-webhook-handler/index.ts` - Webhook payload types

## 🆘 Support

Bij problemen:
1. Check Edge Function logs: `supabase functions logs api-webhook-handler`
2. Verify API key: `supabase secrets list`
3. Test lokaal: `supabase functions serve`
4. Check audit log voor details: Query `v_audit_log_with_users`

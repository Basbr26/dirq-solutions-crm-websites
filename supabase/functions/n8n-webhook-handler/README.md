# n8n Webhook Handler

## Overzicht
Deze Supabase Edge Function ontvangt webhooks van n8n automation workflows en maakt automatisch leads aan in het CRM systeem.

## Gebruik Cases
- **KVK Registraties**: Nieuwe bedrijfsregistraties automatisch importeren
- **LinkedIn Scraping**: Profielen van finance professionals toevoegen
- **Website Detectie**: Nieuwe websites/bedrijven uit web scraping

## Endpoint
```
POST https://[project-ref].supabase.co/functions/v1/n8n-webhook-handler
```

## Authenticatie
De webhook vereist een secret key in de header:
```
X-Webhook-Secret: [your-secret-key]
```

Stel de secret in via Supabase dashboard:
```bash
# Via Supabase CLI
supabase secrets set N8N_WEBHOOK_SECRET=your-secret-key-here
supabase secrets set DEFAULT_LEAD_OWNER_ID=user-uuid-here
```

## Request Payload

### Voorbeeld: KVK Registratie
```json
{
  "type": "kvk_registration",
  "company_name": "Finance Solutions B.V.",
  "kvk_number": "12345678",
  "website": "https://financesolutions.nl",
  "email": "info@financesolutions.nl",
  "phone": "+31201234567",
  "address": {
    "street": "Hoofdstraat 123",
    "city": "Amsterdam",
    "postal_code": "1011 AB",
    "country": "Nederland"
  },
  "contact": {
    "first_name": "Jan",
    "last_name": "Jansen",
    "position": "CFO",
    "linkedin_url": "https://linkedin.com/in/janjansen"
  },
  "industry": "Finance",
  "source": "KVK API",
  "metadata": {
    "registration_date": "2026-01-07",
    "company_size": "11-50",
    "annual_revenue": "500000"
  }
}
```

### Voorbeeld: LinkedIn Profile
```json
{
  "type": "linkedin_profile",
  "company_name": "TechStart BV",
  "website": "https://techstart.nl",
  "contact": {
    "first_name": "Maria",
    "last_name": "Peters",
    "position": "Finance Director",
    "linkedin_url": "https://linkedin.com/in/mariapeters"
  },
  "industry": "Technology",
  "source": "LinkedIn Scraper",
  "metadata": {
    "company_size": "51-200",
    "location": "Utrecht"
  }
}
```

### Vereiste Velden
- `type`: "kvk_registration" | "linkedin_profile" | "website_scan"
- `company_name`: Naam van het bedrijf
- `source`: Bron van de data (bijv. "KVK API", "LinkedIn Scraper")

### Optionele Velden
- `kvk_number`: KVK nummer
- `website`: Website URL
- `email`: E-mailadres
- `phone`: Telefoonnummer
- `address`: Object met adresgegevens
- `contact`: Object met contactpersoonsgegevens
- `industry`: Bedrijfstak/industrie
- `metadata`: Vrije metadata als object

## Response

### Success (200)
```json
{
  "success": true,
  "company_id": "uuid-here",
  "contact_id": "uuid-here",
  "message": "Lead successfully processed: Finance Solutions B.V."
}
```

### Error (400/401/500)
```json
{
  "error": "Error message here",
  "details": "Additional error details"
}
```

## n8n Workflow Setup

### 1. Webhook Node
```javascript
// In n8n, add a Webhook node:
- HTTP Method: POST
- Path: /kvk-leads
- Response Mode: Return when workflow finishes
```

### 2. HTTP Request Node
```javascript
// Configure HTTP Request naar Supabase:
{
  "method": "POST",
  "url": "https://[project-ref].supabase.co/functions/v1/n8n-webhook-handler",
  "authentication": "Header Auth",
  "headers": {
    "X-Webhook-Secret": "={{$env.SUPABASE_WEBHOOK_SECRET}}"
  },
  "body": {
    "type": "kvk_registration",
    "company_name": "={{$json.bedrijfsnaam}}",
    "kvk_number": "={{$json.kvkNummer}}",
    // ... map other fields
  }
}
```

### 3. Error Handling
Voeg een Error Trigger toe om mislukte webhook calls te loggen.

## Beveiliging
- ✅ Webhook secret validatie
- ✅ CORS headers
- ✅ Service role key voor database access
- ⚠️ Validatie van input data
- ⚠️ Rate limiting (voeg toe via Supabase Edge Function config)

## Testing

### cURL Example
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/n8n-webhook-handler \
  -H "X-Webhook-Secret: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "kvk_registration",
    "company_name": "Test Company BV",
    "source": "Manual Test",
    "metadata": {
      "test": true
    }
  }'
```

### Postman Collection
Import the following JSON into Postman:
```json
{
  "info": { "name": "n8n Webhook Handler" },
  "item": [{
    "name": "Create Lead from KVK",
    "request": {
      "method": "POST",
      "header": [
        {
          "key": "X-Webhook-Secret",
          "value": "{{webhook_secret}}"
        }
      ],
      "body": {
        "mode": "raw",
        "raw": "{\n  \"type\": \"kvk_registration\",\n  \"company_name\": \"Test BV\",\n  \"source\": \"Postman Test\"\n}"
      },
      "url": "https://{{project_ref}}.supabase.co/functions/v1/n8n-webhook-handler"
    }
  }]
}
```

## Logging & Monitoring
Logs zijn beschikbaar via Supabase Dashboard:
1. Go to Edge Functions
2. Select `n8n-webhook-handler`
3. View Logs tab

## Troubleshooting

### Error: "Unauthorized: Invalid webhook secret"
- Check `N8N_WEBHOOK_SECRET` in Supabase secrets
- Verify header in n8n HTTP Request node

### Error: "Missing required fields"
- Ensure `company_name`, `type`, and `source` are present in payload

### Company Not Created
- Check default owner ID is set: `DEFAULT_LEAD_OWNER_ID`
- Verify user exists in profiles table

### Contact Not Created
- Ensure both `first_name` and `last_name` are provided
- Check contact data in payload

## Deployment
```bash
# Deploy edge function
supabase functions deploy n8n-webhook-handler

# Set secrets
supabase secrets set N8N_WEBHOOK_SECRET=your-secret-key
supabase secrets set DEFAULT_LEAD_OWNER_ID=user-uuid
```

## Maintenance
- **Rate Limiting**: Monitor webhook call volume
- **Data Quality**: Review automated leads weekly
- **Deduplication**: Check for duplicate companies
- **Source Tagging**: All leads tagged with "n8n-automated"

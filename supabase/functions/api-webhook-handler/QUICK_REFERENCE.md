# 🚀 AI Webhook Quick Reference

## URLs

```
Production: https://[project-ref].supabase.co/functions/v1/api-webhook-handler
Local Dev:  http://localhost:54321/functions/v1/api-webhook-handler
```

## Authentication

```bash
Header: X-API-Key: [your-api-key]
```

## Actions

| Action | Required | Example |
|--------|----------|---------|
| `create_lead` | `company_name`, `title` | New project from form |
| `create_company` | `name` | Add new prospect |
| `create_contact` | `company_id`, `first_name`, `last_name` | Add contact person |
| `add_note` | `entity_type`, `entity_id`, `content` | Log interaction |

## cURL Examples

### Create Lead
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/api-webhook-handler \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "action": "create_lead",
    "data": {
      "company_name": "Acme Corp",
      "title": "Website Project",
      "value": 8500
    }
  }'
```

### Create Company
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/api-webhook-handler \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "action": "create_company",
    "data": {
      "name": "New Client BV",
      "email": "info@client.nl",
      "status": "prospect"
    }
  }'
```

### Add Note
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/api-webhook-handler \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "action": "add_note",
    "data": {
      "entity_type": "project",
      "entity_id": "uuid-here",
      "content": "Follow-up call scheduled"
    }
  }'
```

## n8n Quick Setup

```javascript
// HTTP Request Node
{
  "method": "POST",
  "url": "https://[project-ref].supabase.co/functions/v1/api-webhook-handler",
  "headers": {
    "X-API-Key": "{{$env.CRM_API_KEY}}",
    "User-Agent": "n8n-workflow/1.0"
  },
  "body": {
    "action": "create_lead",
    "data": "={{$json}}"
  }
}
```

## Manus AI Quick Setup

```typescript
{
  name: "createLead",
  http: {
    method: "POST",
    url: "https://[project-ref].supabase.co/functions/v1/api-webhook-handler",
    headers: {
      "X-API-Key": "[your-key]",
      "User-Agent": "Manus-AI/2.0"
    },
    body: {
      action: "create_lead",
      data: "{{parameters}}"
    }
  }
}
```

## Response Format

### Success
```json
{
  "success": true,
  "data": {
    "project_id": "uuid",
    "company_id": "uuid",
    "owner_id": "uuid",
    "message": "Lead successfully created"
  },
  "metadata": {
    "action": "create_lead",
    "source": "n8n",
    "timestamp": "2026-01-07T10:30:00Z"
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Missing required fields",
  "details": "company_name and title are required"
}
```

## Monitoring

### View Logs
```bash
supabase functions logs api-webhook-handler --follow
```

### Check Audit Trail
```sql
SELECT * FROM v_audit_log_with_users
WHERE detected_client_type IN ('n8n Workflow', 'Manus AI')
ORDER BY created_at DESC
LIMIT 50;
```

### Get Stats
```sql
SELECT * FROM get_audit_stats(NOW() - INTERVAL '24 hours', NOW());
```

## Deployment

```bash
# Deploy function
./supabase/functions/api-webhook-handler/deploy.sh

# Or manually:
supabase functions deploy api-webhook-handler
supabase secrets set WEBHOOK_API_KEY=your-key
```

## Testing

```bash
# Local testing
supabase functions serve api-webhook-handler

# Test endpoint
curl -X POST http://localhost:54321/functions/v1/api-webhook-handler \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{"action":"create_lead","data":{"company_name":"Test","title":"Test"}}'
```

## Common Errors

| Status | Error | Fix |
|--------|-------|-----|
| 401 | Invalid API key | Check X-API-Key header |
| 400 | Unknown action | Use valid action name |
| 400 | Missing fields | Check required fields |
| 500 | Database error | Check RLS policies |

## Project Types

- `landing_page` - Simple landing pages
- `corporate_website` - Business websites
- `ecommerce` - Online shops
- `web_app` - Web applications
- `blog` - Blog/content sites
- `portfolio` - Portfolio sites
- `custom` - Custom projects

## Priority Levels

- `low` - Can wait
- `medium` - Normal priority (default)
- `high` - Important, fast response needed

## Status Values

- `prospect` - Potential customer
- `active` - Current customer
- `inactive` - Inactive account
- `churned` - Lost customer

## Full Documentation

📖 Complete guide: `supabase/functions/api-webhook-handler/README.md`
🔧 n8n templates: `supabase/functions/api-webhook-handler/N8N_TEMPLATES.md`
🧪 Test suite: `supabase/functions/api-webhook-handler/test.ts`

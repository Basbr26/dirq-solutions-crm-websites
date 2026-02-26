# n8n Logic Rules - HTTP-RPC Pattern

> **VERPLICHT**: Alle database-acties vanuit n8n MOETEN via HTTP Request naar Supabase PostgREST API.

---

## Het HTTP-RPC Patroon

### Waarom?
- **IPv6 incompatibiliteit**: n8n Cloud ondersteunt alleen IPv4; native Supabase/Postgres nodes falen
- **Consistentie**: Alle workflows gebruiken hetzelfde pattern
- **Debugging**: HTTP requests zijn makkelijker te debuggen dan native nodes
- **Flexibiliteit**: Volledige PostgREST API toegang (RPC, filters, joins)

### Architectuur
```
n8n Workflow
    ↓
HTTP Request Node (GET/POST/PATCH/DELETE)
    ↓
Supabase PostgREST API (/rest/v1/)
    ↓
PostgreSQL (met RLS bypass via service_role)
```

---

## Implementatie

### VERBODEN
```
NOOIT n8n-nodes-base.supabase (native Supabase node)
NOOIT n8n-nodes-base.postgres (native Postgres node)
NOOIT n8n-nodes-base.postgresTrigger (Postgres trigger)
NOOIT database credentials direct in workflow
```

### VERPLICHT
```
ALTIJD n8n-nodes-base.httpRequest (typeVersion 4.2)
ALTIJD PostgREST API endpoint (/rest/v1/table of /rest/v1/rpc/function)
ALTIJD service_role key in headers (bypass RLS voor automation)
ALTIJD Prefer: return=representation voor INSERT/UPDATE
```

---

## HTTP Request Node Configuratie

### Standaard Setup
```json
{
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "parameters": {
    "method": "GET",
    "url": "https://pdqdrdddgbiiktcwdslv.supabase.co/rest/v1/table_name",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "apikey", "value": "={{ $env.SUPABASE_SERVICE_KEY }}" },
        { "name": "Authorization", "value": "=Bearer {{ $env.SUPABASE_SERVICE_KEY }}" },
        { "name": "Content-Type", "value": "application/json" },
        { "name": "Prefer", "value": "return=representation" }
      ]
    }
  }
}
```

### CRUD Operations

**SELECT (Read)**
```
GET /rest/v1/projects?select=id,title,value,stage,companies!fk_project_company(id,name)
    &stage=eq.live
    &order=created_at.desc
    &limit=10
```

**INSERT (Create)**
```
POST /rest/v1/notifications
Body: { "user_id": "...", "title": "...", "message": "...", "type": "update" }
```

**UPDATE**
```
PATCH /rest/v1/projects?id=eq.{project_id}
Body: { "stage": "quote_signed", "updated_at": "{{ $now.toISO() }}" }
```

**DELETE**
```
DELETE /rest/v1/atc_processed_events?created_at=lt.{{ $now.minus({days: 30}).toISO() }}
```

### RPC Function Calls
```
POST /rest/v1/rpc/match_crm_knowledge
Body: { "query_embedding": [...], "match_threshold": 0.5, "match_count": 5 }
```

---

## FK Disambiguatie

Bij meerdere FK relaties naar dezelfde tabel, gebruik expliciete FK naam:
```
?select=*,companies!fk_project_company(id,name)
```

Zonder dit geeft PostgREST een PGRST201 error (ambiguous relationship).

---

## AI Model Configuratie

```json
{
  "type": "@n8n/n8n-nodes-langchain.lmChatGoogleVertex",
  "typeVersion": 1,
  "parameters": {
    "projectId": {
      "__rl": true,
      "mode": "id",
      "value": "dirq-solutions-crm-website"
    },
    "modelName": "gemini-2.0-flash"
  },
  "credentials": {
    "googleApi": { "id": "9SZVBhI8ZWjav8KD", "name": "Google Vertex" }
  }
}
```

---

## Error Handling

### Response Check
```javascript
if ($input.item.json.statusCode >= 400) {
  throw new Error(`PostgREST failed: ${$input.item.json.body.message}`);
}
return { success: true, data: $input.item.json.body };
```

### Fault Tolerance
Voor niet-kritieke operaties (markeren als verwerkt, etc.):
```json
{ "onError": "continueRegularOutput" }
```

### DLQ Pattern
Bij errors, insert in `atc_failed_events`:
```json
POST /rest/v1/atc_failed_events
{
  "event_type": "...",
  "payload": { ... },
  "error_message": "...",
  "retry_count": 0,
  "next_retry_at": "{{ $now.plus({ minutes: 5 }).toISO() }}",
  "status": "pending"
}
```

---

## Checklist voor Nieuwe Workflows

- [ ] Geen native Supabase/Postgres nodes
- [ ] HTTP Request met PostgREST API
- [ ] service_role key in headers
- [ ] FK disambiguatie waar nodig
- [ ] Error handling geimplementeerd
- [ ] Credentials via n8n Environment Variables
- [ ] Google Vertex AI voor AI nodes (niet Gemini/PaLM)

---

*Dit is een HARDE REGEL - geen uitzonderingen.*

*Laatste update: 4 februari 2026*

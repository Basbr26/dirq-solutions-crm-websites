# Supabase Integration Skill

## Overzicht
Deze skill definieert het verplichte HTTP-RPC patroon voor n8n ↔ Supabase integratie.
**NOOIT** de native Supabase node gebruiken - altijd HTTP Request met PostgREST API.

---

## Waarom HTTP Request?

### Problemen met Native Supabase Node
1. **IPv6 incompatibiliteit** - n8n Cloud ondersteunt alleen IPv4
2. **Beperkte functionaliteit** - Geen RPC, geen realtime, geen storage
3. **Connection pooling issues** - Timeout problemen bij hoge load
4. **Credential management** - Moeilijker te debuggen

### Voordelen HTTP-RPC Patroon
- Volledige PostgREST API toegang
- RPC function calls
- Betere foutafhandeling
- Eenvoudiger te testen en debuggen
- Consistente credentials via headers

---

## HTTP Request Configuratie

### Basis Setup
```json
{
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "parameters": {
    "method": "GET",
    "url": "={{ $env.SUPABASE_URL }}/rest/v1/table_name",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "apikey", "value": "={{ $env.SUPABASE_ANON_KEY }}" },
        { "name": "Authorization", "value": "=Bearer {{ $env.SUPABASE_ANON_KEY }}" },
        { "name": "Content-Type", "value": "application/json" },
        { "name": "Prefer", "value": "return=representation" }
      ]
    }
  }
}
```

---

## CRUD Operaties

### SELECT (Read)
```json
{
  "method": "GET",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/projects?select=id,title,value,stage",
  "qs": {
    "stage": "eq.live",
    "order": "created_at.desc",
    "limit": "10"
  }
}
```

### INSERT (Create)
```json
{
  "method": "POST",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/notifications",
  "body": {
    "user_id": "={{ $json.owner_id }}",
    "title": "={{ $json.notification_title }}",
    "message": "={{ $json.notification_message }}",
    "type": "stage_change"
  },
  "options": {
    "response": { "fullResponse": true }
  }
}
```

### UPDATE
```json
{
  "method": "PATCH",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/projects?id=eq.{{ $json.project_id }}",
  "body": {
    "stage": "={{ $json.new_stage }}",
    "updated_at": "={{ $now.toISO() }}"
  }
}
```

### DELETE
```json
{
  "method": "DELETE",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/atc_processed_events?created_at=lt.{{ $now.minus({days: 30}).toISO() }}"
}
```

---

## RPC Function Calls

### Supabase Edge Function
```json
{
  "method": "POST",
  "url": "={{ $env.SUPABASE_URL }}/functions/v1/function-name",
  "body": {
    "param1": "value1",
    "param2": "value2"
  },
  "options": {
    "timeout": 30000
  }
}
```

### Database RPC (PostgreSQL Function)
```json
{
  "method": "POST",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/rpc/function_name",
  "body": {
    "param_name": "param_value"
  }
}
```

---

## PostgREST Query Operators

### Vergelijkingen
| Operator | Betekenis | Voorbeeld |
|----------|-----------|-----------|
| `eq` | Gelijk aan | `?status=eq.active` |
| `neq` | Niet gelijk | `?stage=neq.lost` |
| `gt` | Groter dan | `?value=gt.1000` |
| `gte` | Groter of gelijk | `?created_at=gte.2024-01-01` |
| `lt` | Kleiner dan | `?priority=lt.50` |
| `lte` | Kleiner of gelijk | `?value=lte.5000` |
| `like` | Pattern match | `?name=like.*solutions*` |
| `ilike` | Case-insensitive like | `?email=ilike.*@gmail.com` |
| `in` | In lijst | `?stage=in.(lead,contacted)` |
| `is` | Is null/not null | `?deleted_at=is.null` |

### Logische Operators
```
# AND (standaard)
?stage=eq.live&status=eq.active

# OR
?or=(stage.eq.live,stage.eq.maintenance)

# NOT
?stage=not.eq.lost
```

### Relaties
```
# Inner join
?select=*,companies(name,status)

# Left join (null allowed)
?select=*,contacts!left(email)
```

---

## Error Handling

### Response Codes
| Code | Betekenis | Actie |
|------|-----------|-------|
| 200 | Success | Verwerk data |
| 201 | Created | Check returned id |
| 204 | No content | Operatie geslaagd, geen data |
| 400 | Bad request | Check query/body syntax |
| 401 | Unauthorized | Check API key |
| 404 | Not found | Resource bestaat niet |
| 409 | Conflict | Duplicate key violation |
| 422 | Validation error | Check constraint violation |

### Error Response Parsing
```javascript
// In Function node na HTTP Request
const response = $input.item.json;

if (response.error) {
  throw new Error(`Supabase Error: ${response.message}`);
}

if (response.code === 'PGRST116') {
  // No rows returned - niet per se een fout
  return { isEmpty: true, data: [] };
}

return response;
```

---

## Prefer Headers

### Return Representation
```
Prefer: return=representation
```
Retourneert de aangemaakte/gewijzigde rij.

### Return Minimal
```
Prefer: return=minimal
```
Retourneert alleen status code.

### Upsert
```
Prefer: resolution=merge-duplicates
```
Insert of update bij conflict.

### Count
```
Prefer: count=exact
```
Voegt count header toe aan response.

---

## Environment Variables

Benodigde n8n environment variables:

```env
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_KEY=[service-key]  # Voor admin operaties
```

### Gebruik in Expressions
```javascript
// URL
={{ $env.SUPABASE_URL }}/rest/v1/table

// Headers
={{ $env.SUPABASE_ANON_KEY }}
```

---

## Best Practices

### Security
- Gebruik `SUPABASE_ANON_KEY` voor publieke operaties
- Gebruik `SUPABASE_SERVICE_KEY` alleen voor admin taken
- Nooit credentials hardcoden in workflow
- Altijd Row Level Security (RLS) actief houden

### Performance
- Selecteer alleen nodige kolommen: `?select=id,name`
- Gebruik pagination: `?limit=100&offset=0`
- Indexeer veelgebruikte query kolommen
- Batch inserts met array in body

### Debugging
1. Test queries eerst in Supabase SQL Editor
2. Gebruik Postman/curl voor API testing
3. Check Supabase logs voor database errors
4. n8n execution logs voor HTTP errors

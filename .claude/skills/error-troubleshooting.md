# n8n Error Troubleshooting Skill

## Overzicht
Systematische aanpak voor het diagnosticeren en fixen van n8n workflow fouten, inclusief database constraint violations en API errors.

---

## Fout Diagnose Stappenplan

### Stap 1: Identificeer de Fout
```
1. Open n8n → Executions
2. Vind de gefaalde execution
3. Klik op de rode node
4. Lees de error message
```

### Stap 2: Categoriseer de Fout
| Categorie | Indicatoren |
|-----------|-------------|
| Expression Error | "Cannot read property", "undefined" |
| HTTP Error | Status codes 4xx, 5xx |
| Database Error | PGRST codes, constraint violations |
| Connection Error | Timeout, ENETUNREACH |
| Validation Error | "Invalid", "required" |

### Stap 3: Gebruik MCP Tools
```
mcp__n8n-mcp__n8n_executions
- action: "get"
- id: "[execution-id]"
- mode: "error"
```

---

## Database Constraint Violations

### Check Constraint Errors

**Symptoom:**
```
new row for relation "table" violates check constraint "constraint_name"
```

**Diagnose:**
1. Identificeer de constraint naam
2. Check de constraint definitie in database
3. Vergelijk met de data die je probeert in te voegen

**Veelvoorkomende Constraints:**

| Constraint | Probleem | Oplossing |
|------------|----------|-----------|
| `stage_check` | Ongeldige stage waarde | Gebruik alleen toegestane stages |
| `value_positive` | Negatieve value | Zorg dat value >= 0 |
| `email_format` | Ongeldig email | Valideer email format |
| `status_check` | Ongeldige status | Check allowed status waarden |

**Fix Voorbeeld:**
```javascript
// In Function node voor insert
const validStages = ['lead', 'contacted', 'quote_sent', 'quote_signed', 'live', 'lost'];
const stage = $json.stage;

if (!validStages.includes(stage)) {
  throw new Error(`Invalid stage: ${stage}. Must be one of: ${validStages.join(', ')}`);
}

return $json;
```

### Foreign Key Violations

**Symptoom:**
```
insert or update on table "X" violates foreign key constraint "fk_..."
```

**Diagnose:**
1. De gerelateerde record bestaat niet
2. Of je probeert een record te verwijderen die nog gerefereerd wordt

**Fix:**
```javascript
// Check of parent record bestaat
const companyExists = $node["Check Company"].json.length > 0;

if (!companyExists) {
  // Maak eerst company aan, of skip
  return { skip: true, reason: 'Company does not exist' };
}

return $json;
```

### Unique Constraint Violations

**Symptoom:**
```
duplicate key value violates unique constraint "..."
```

**Diagnose:**
Record met deze unique waarde bestaat al.

**Fix - Upsert Pattern:**
```json
{
  "method": "POST",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/table",
  "headers": {
    "Prefer": "resolution=merge-duplicates"
  },
  "body": { ... }
}
```

---

## HTTP Error Codes

### 4xx Client Errors

| Code | Betekenis | Oplossing |
|------|-----------|-----------|
| 400 | Bad Request | Check request body/params syntax |
| 401 | Unauthorized | Vernieuw API key/token |
| 403 | Forbidden | Check permissions/scopes |
| 404 | Not Found | Resource bestaat niet |
| 409 | Conflict | Duplicate of versie conflict |
| 422 | Unprocessable | Validatie gefaald |
| 429 | Rate Limited | Voeg retry logic/delay toe |

### 5xx Server Errors

| Code | Betekenis | Oplossing |
|------|-----------|-----------|
| 500 | Server Error | Bug in API, check logs |
| 502 | Bad Gateway | Retry later, check uptime |
| 503 | Service Unavailable | Maintenance, retry later |
| 504 | Gateway Timeout | Verhoog timeout, retry |

### Retry Logic Pattern
```javascript
// In Function node
const maxRetries = 3;
const retryDelay = 1000; // ms

const response = $json;

if (response.statusCode >= 500 && $json.retryCount < maxRetries) {
  // Trigger retry
  return {
    ...$json,
    retryCount: ($json.retryCount || 0) + 1,
    nextRetryAt: Date.now() + retryDelay
  };
}

if (response.statusCode >= 400) {
  throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
}

return response;
```

---

## Expression Errors

### "Cannot read property of undefined"

**Oorzaak:** Je probeert een property te lezen van een null/undefined object.

**Diagnose:**
```javascript
// Check wat undefined is
console.log('Data:', JSON.stringify($json, null, 2));
```

**Fix:**
```javascript
// Optional chaining
={{ $json.company?.name ?? 'Geen bedrijf' }}

// Of expliciet checken
={{ $json.company ? $json.company.name : 'Geen bedrijf' }}
```

### "X is not a function"

**Oorzaak:** Je roept een method aan op een verkeerd type.

**Diagnose:**
```javascript
console.log('Type:', typeof $json.items);
// Als dit 'string' is ipv 'object', moet je eerst parsen
```

**Fix:**
```javascript
// Parse JSON string
const items = typeof $json.items === 'string'
  ? JSON.parse($json.items)
  : $json.items;

return items.map(i => i.name);
```

### "Unexpected token"

**Oorzaak:** Syntax error in expressie.

**Veelvoorkomende fouten:**
```javascript
// Fout: missing quotes
❌ ={{ $json.status === active }}
✓  ={{ $json.status === 'active' }}

// Fout: wrong brackets
❌ ={{ $json.items(0) }}
✓  ={{ $json.items[0] }}

// Fout: missing operator
❌ ={{ $json.a $json.b }}
✓  ={{ $json.a + $json.b }}
```

---

## Connection Errors

### ENETUNREACH

**Symptoom:**
```
connect ENETUNREACH [IPv6 address]:5432
```

**Oorzaak:** n8n Cloud ondersteunt geen IPv6.

**Fix:**
1. Gebruik HTTP Request ipv native node
2. Of gebruik database webhook pattern (database roept n8n aan)

### ETIMEDOUT

**Symptoom:**
```
connect ETIMEDOUT
```

**Oorzaak:**
- Server onbereikbaar
- Firewall blokkade
- DNS probleem

**Fix:**
1. Check of service online is
2. Verify URL correct is
3. Check network/firewall settings
4. Verhoog timeout in node settings

### ECONNREFUSED

**Symptoom:**
```
connect ECONNREFUSED
```

**Oorzaak:** Server weigert connectie.

**Fix:**
1. Check of service draait
2. Verify port correct is
3. Check firewall regels

---

## Workflow Validation Errors

### "Node not connected"

**Fix:**
Voeg connection toe in workflow JSON:
```json
"connections": {
  "Source Node": {
    "main": [[{ "node": "Target Node", "type": "main", "index": 0 }]]
  }
}
```

### "Invalid typeVersion"

**Diagnose:**
```
mcp__n8n-mcp__get_node
- nodeType: "nodes-base.httpRequest"
- mode: "versions"
```

**Fix:**
Upgrade naar ondersteunde versie via autofix:
```
mcp__n8n-mcp__n8n_autofix_workflow
- id: "workflow-id"
- fixTypes: ["typeversion-correction"]
- applyFixes: true
```

### "Credential not found"

**Fix:**
1. Check of credential bestaat in n8n
2. Of strip credentials bij template deploy:
```
mcp__n8n-mcp__n8n_deploy_template
- templateId: ...
- stripCredentials: true
```

---

## Debugging Workflow

### 1. Isoleer het Probleem
```
1. Deactiveer workflow
2. Dupliceer probleem node
3. Test met hardcoded values
4. Als dat werkt, probleem is in expressie
5. Als niet, probleem is in node configuratie
```

### 2. Voeg Debug Nodes Toe
```json
{
  "type": "n8n-nodes-base.set",
  "name": "Debug Point 1",
  "parameters": {
    "mode": "raw",
    "jsonOutput": "={{ JSON.stringify($json, null, 2) }}"
  }
}
```

### 3. Check Execution Data
```
mcp__n8n-mcp__n8n_executions
- action: "get"
- id: "[execution-id]"
- mode: "full"
- includeInputData: true
```

### 4. Validate Before Deploy
```
mcp__n8n-mcp__n8n_validate_workflow
- id: "[workflow-id]"
- options: {
    "validateNodes": true,
    "validateConnections": true,
    "validateExpressions": true,
    "profile": "strict"
  }
```

---

## Error Recovery Patterns

### Circuit Breaker
```javascript
const state = $node["Get Circuit State"].json;

if (state.status === 'open') {
  // Skip processing, queue to DLQ
  return { action: 'queue_to_dlq' };
}

if (state.failure_count >= 3) {
  // Open circuit
  return { action: 'open_circuit' };
}

// Proceed normally
return { action: 'process' };
```

### Dead Letter Queue
```javascript
// Na error, insert in DLQ
{
  "event_type": $json.event_type,
  "payload": $json,
  "error_message": $json.errorMessage,
  "retry_count": 0,
  "next_retry_at": $now.plus({ minutes: 5 }).toISO()
}
```

### Fallback Values
```javascript
// Als AI call faalt, gebruik template
const aiResponse = $json.ai_response;
const fallback = `Project "${$json.title}" is nu in status "${$json.new_stage}".`;

return {
  notification: aiResponse || fallback,
  usedFallback: !aiResponse
};
```

---

## Quick Diagnostics Checklist

- [ ] Is de workflow actief?
- [ ] Zijn alle credentials geconfigureerd?
- [ ] Is de trigger correct (webhook URL, schedule)?
- [ ] Kloppen alle node namen in expressies?
- [ ] Zijn alle required parameters ingevuld?
- [ ] Is de data in het juiste formaat?
- [ ] Zijn er rate limits geraakt?
- [ ] Is de externe service beschikbaar?
- [ ] Zijn er database constraints geschonden?
- [ ] Is de expression syntax correct (starts with =)?

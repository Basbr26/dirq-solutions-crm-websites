# n8n Rules - Dirq Solutions CRM

> Regels voor n8n workflow development en automation.

---

## KRITIEKE REGELS

### 1. NOOIT Native Supabase/Postgres Nodes
n8n Cloud ondersteunt alleen IPv4. Native Supabase en Postgres nodes gebruiken IPv6 en falen.

**VERBODEN:**
- `n8n-nodes-base.supabase` (native Supabase node)
- `n8n-nodes-base.postgres` (native Postgres node)
- `n8n-nodes-base.postgresTrigger` (Postgres trigger)

**VERPLICHT:**
- `n8n-nodes-base.httpRequest` (typeVersion 4.2) naar Supabase PostgREST API

### 2. HTTP Request Headers
```json
{
  "apikey": "{{ $env.SUPABASE_SERVICE_KEY }}",
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}",
  "Content-Type": "application/json",
  "Prefer": "return=representation"
}
```

### 3. AI Model
- **Provider:** Google Vertex AI
- **Model:** gemini-2.0-flash
- **Node:** `@n8n/n8n-nodes-langchain.lmChatGoogleVertex` (typeVersion 1)
- **Project:** `dirq-solutions-crm-website`
- **Credential ID:** `9SZVBhI8ZWjav8KD`

### 4. FK Disambiguatie
Bij PostgREST queries met meerdere FK relaties, gebruik expliciete FK naam:
```
?select=*,companies!fk_project_company(id,name)
```

---

## Actieve Workflows

| Workflow | ID | Status |
|----------|----|--------|
| CRM AI Chatbot | `lo0RW5Sw4UHXnMpr` | ACTIEF |
| ATC Orchestrator | `IGMxMoXs4v04waOb` | ACTIEF |
| Company Searcher | `3WcnIawEzSfOKiss` | ACTIEF |
| Project Searcher | `rpbHzxjBd0OPQnh2` | ACTIEF |
| Contact Searcher | `fvCEfhk3lCGtAzFJ` | ACTIEF |
| Quote Searcher | `o2HhV82OXqHvF1oH` | ACTIEF |
| Activity Searcher | `yO5DrnZuMuTWk2Be` | ACTIEF |
| Deal Manager | `58WpdsvPp6r7nd73` | ACTIEF |
| Stage Transitioner | `OXoHn2dPYWc1mPXm` | ACTIEF |
| Note Logger | `gZvPPvNlvvXS6hOA` | ACTIEF |

---

## Workflow Best Practices

### 1. Sub-Workflow Pattern
Elke tool-workflow volgt:
```
Execute Workflow Trigger → HTTP Request (PostgREST) → Return
```

### 2. Deterministische Paden
Kritieke CRM-paden (contractverwerking) moeten deterministisch blijven - geen AI voor juridische acties.

### 3. Error Handling
- Elke AI-node moet expliciete error-handling paden hebben
- Gebruik `onError: "continueRegularOutput"` voor fault tolerance
- DLQ pattern voor gefaalde events

### 4. Code Nodes
Houd logica eenvoudig, splits complexe operaties in meerdere nodes.

---

## Webhook Payload
```json
{
  "message": "User input",
  "sessionId": "unique-session-id",
  "user_id": "uuid"
}
```

## MCP Tools
- `n8n_list_workflows()` - Overzicht
- `n8n_get_workflow(id)` - Details
- `n8n_update_partial_workflow(id, operations)` - Incremental update
- `n8n_update_full_workflow(id, name, nodes, connections)` - Full update
- `n8n_test_workflow(id)` - Test
- `n8n_executions(action='list')` - History
- `n8n_validate_workflow(id)` - Validatie

---

*Laatste update: 4 februari 2026*

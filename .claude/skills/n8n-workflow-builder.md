# n8n Workflow Builder Skill

## Overzicht
Deze skill bevat instructies voor het bouwen van n8n workflows die direct canvas-ready zijn, met verplichte foutafhandeling en correcte validatie.

---

## Canvas-Ready JSON Structuur

### Verplichte Node Velden
Elke node MOET de volgende velden bevatten:

```json
{
  "id": "unieke-uuid",
  "name": "Beschrijvende Naam",
  "type": "n8n-nodes-base.nodeType",
  "typeVersion": 2,
  "position": [x, y],
  "parameters": {}
}
```

### Positionering
- Start trigger op positie `[0, 0]`
- Horizontale afstand: **300px** tussen nodes
- Verticale afstand: **150px** voor parallelle branches
- Error handler altijd rechtsonder van de workflow

---

## Verplichte Foutafhandeling

### Error Trigger Node
Elke productie-workflow MOET een Error Trigger bevatten:

```json
{
  "id": "error-handler",
  "name": "Error Trigger",
  "type": "n8n-nodes-base.errorTrigger",
  "typeVersion": 1,
  "position": [900, 300],
  "parameters": {}
}
```

### Error Outputs
Voor nodes met `onError` support, configureer:
```json
{
  "onError": "continueErrorOutput",
  "continueOnFail": false
}
```

### Dead Letter Queue Pattern
Altijd een DLQ node toevoegen voor gefaalde events:
1. Error Trigger → DLQ Insert (Supabase)
2. Log error details: timestamp, node, message, payload

---

## n8n-mcp Validatie Tools

### Voor het Deployen

**1. Valideer individuele nodes:**
```
mcp__n8n-mcp__validate_node
- nodeType: "nodes-base.httpRequest"
- config: { ...node parameters }
- mode: "full"
```

**2. Valideer complete workflow:**
```
mcp__n8n-mcp__validate_workflow
- workflow: { nodes: [...], connections: {...} }
- options: { validateNodes: true, validateConnections: true, validateExpressions: true }
```

**3. Autofix bekende problemen:**
```
mcp__n8n-mcp__n8n_autofix_workflow
- id: "workflow-id"
- applyFixes: true
- fixTypes: ["expression-format", "typeversion-correction"]
```

### Validatie Checklist
- [ ] Alle nodes hebben unieke `id` en `name`
- [ ] `typeVersion` is de nieuwste beschikbare
- [ ] Connections gebruiken `name` (niet `id`) als key
- [ ] Webhook paths zijn uniek
- [ ] Credentials zijn verwijderd voor templates (stripCredentials: true)

---

## Connection Structuur

### Correct Format
```json
{
  "connections": {
    "Trigger Node Naam": {
      "main": [
        [
          { "node": "Volgende Node Naam", "type": "main", "index": 0 }
        ]
      ]
    }
  }
}
```

### Error Output Connections
Voor nodes met error output:
```json
{
  "Node Naam": {
    "main": [
      [{ "node": "Success Path", "type": "main", "index": 0 }],
      [{ "node": "Error Handler", "type": "main", "index": 0 }]
    ]
  }
}
```

---

## Best Practices

### Naming Conventions
- Triggers: `[Type] - [Beschrijving]` (bijv. "Webhook - ATC Events")
- Functions: `[Actie]` (bijv. "Parse Payload", "Calculate Priority")
- API calls: `[Service] - [Actie]` (bijv. "Supabase - Insert Notification")

### Workflow Settings
```json
{
  "settings": {
    "executionOrder": "v1",
    "saveDataSuccessExecution": "none",
    "saveDataErrorExecution": "all",
    "timezone": "Europe/Amsterdam"
  }
}
```

### Performance
- Gebruik `executeOnce: true` voor scheduled workflows
- Batch operations waar mogelijk
- Set timeouts voor HTTP requests (max 30s voor AI calls)

---

## Template Gebruik

### Template Deployen
```
mcp__n8n-mcp__n8n_deploy_template
- templateId: 1234
- autoFix: true
- autoUpgradeVersions: true
- stripCredentials: true
```

### Template Zoeken
```
mcp__n8n-mcp__search_templates
- searchMode: "keyword"
- query: "webhook supabase"
- limit: 10
```

---

## Troubleshooting

### Veelvoorkomende Fouten

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| "Connection not found" | Node naam mismatch | Check `name` in connections vs nodes |
| "Invalid expression" | Missing `=` prefix | Alle expressies starten met `={{ }}` |
| "typeVersion not supported" | Verouderde versie | Upgrade via autofix |

### Debugging Workflow
1. Activeer workflow in n8n UI
2. Trigger handmatig of via test webhook
3. Check Executions voor error details
4. Gebruik `mcp__n8n-mcp__n8n_executions` met `mode: "error"` voor analyse

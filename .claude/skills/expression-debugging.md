# n8n Expression Debugging Skill

## Overzicht
Expert-regels voor het schrijven en debuggen van n8n expressies, inclusief `$json`, `$node`, en andere ingebouwde variabelen.

---

## Expression Basics

### Syntax Regels
1. **Alle expressies beginnen met `=`**
   ```
   ={{ $json.field }}      ✓ Correct
   {{ $json.field }}       ✗ Fout - missing =
   ```

2. **Dubbele accolades voor interpolatie**
   ```
   ={{ "Hallo " + $json.name }}     ✓ Correct
   ={{ `Hallo ${$json.name}` }}     ✓ Template literal
   ```

3. **Variabelen zijn case-sensitive**
   ```
   {{ $json.companyName }}   ✓ Als veld zo heet
   {{ $json.companyname }}   ✗ Zal undefined zijn
   ```

---

## Ingebouwde Variabelen

### $json
De output van de vorige node als JSON object.

```javascript
// Simpel veld
={{ $json.id }}

// Genest object
={{ $json.company.name }}

// Array index
={{ $json.items[0].name }}

// Met fallback
={{ $json.field ?? 'default' }}
```

### $node["name"]
Referentie naar output van specifieke node.

```javascript
// Output van specifieke node
={{ $node["HTTP Request"].json.data }}

// Parameters van node
={{ $node["Set Values"].parameter.value }}

// Let op: naam moet EXACT matchen!
={{ $node["Webhook Trigger"].json }}   ✓
={{ $node["webhook trigger"].json }}   ✗ Case mismatch
```

### $input
Huidige input van de node.

```javascript
// Alle items
={{ $input.all() }}

// Eerste item
={{ $input.first() }}

// Laatste item
={{ $input.last() }}

// Specifiek item
={{ $input.item }}
```

### $env
Environment variabelen.

```javascript
={{ $env.SUPABASE_URL }}
={{ $env.API_KEY }}
```

### $execution
Execution metadata.

```javascript
={{ $execution.id }}
={{ $execution.mode }}           // 'manual' of 'trigger'
={{ $execution.resumeUrl }}
```

### $workflow
Workflow metadata.

```javascript
={{ $workflow.id }}
={{ $workflow.name }}
={{ $workflow.active }}
```

### $now
Huidige DateTime (Luxon).

```javascript
={{ $now }}                      // ISO string
={{ $now.toISO() }}              // 2024-01-30T15:30:00.000Z
={{ $now.toFormat('yyyy-MM-dd') }}  // 2024-01-30
={{ $now.minus({ days: 7 }) }}   // 7 dagen geleden
={{ $now.plus({ hours: 24 }) }}  // 24 uur in de toekomst
```

### $today
Begin van vandaag (midnight).

```javascript
={{ $today }}
={{ $today.toISO() }}
```

---

## Veelvoorkomende Fouten

### 1. Missing Equals Sign
```
❌ {{ $json.name }}
✓  ={{ $json.name }}
```

### 2. Undefined Properties
```javascript
// Fout: crashes als company null is
❌ ={{ $json.company.name }}

// Correct: optional chaining
✓  ={{ $json.company?.name }}

// Of met fallback
✓  ={{ $json.company?.name ?? 'Onbekend' }}
```

### 3. Node Name Typos
```javascript
// Fout: spatie op verkeerde plek of verkeerde naam
❌ ={{ $node["HTTP request"].json }}
❌ ={{ $node["HTTP  Request"].json }}  // dubbele spatie

// Correct: exacte naam
✓  ={{ $node["HTTP Request"].json }}
```

### 4. Type Mismatches
```javascript
// Fout: string + number zonder conversie
❌ ={{ "Value: " + $json.amount }}

// Correct: expliciet naar string
✓  ={{ "Value: " + String($json.amount) }}
✓  ={{ `Value: ${$json.amount}` }}
```

### 5. Array vs Object
```javascript
// Als API array teruggeeft:
// $json = [{ id: 1 }, { id: 2 }]

// Fout: $json is array, niet object
❌ ={{ $json.id }}

// Correct: eerste element
✓  ={{ $json[0].id }}

// Of alle ids
✓  ={{ $json.map(item => item.id) }}
```

---

## Date/Time Expressies

### Luxon Formatting
```javascript
// Basis formatting
={{ $now.toFormat('dd-MM-yyyy') }}        // 30-01-2024
={{ $now.toFormat('HH:mm:ss') }}          // 15:30:45
={{ $now.toFormat('dd MMMM yyyy') }}      // 30 January 2024

// Nederlandse locale
={{ $now.setLocale('nl').toFormat('cccc dd MMMM') }}  // dinsdag 30 januari
```

### Date Manipulatie
```javascript
// Rekenen met dates
={{ $now.minus({ days: 30 }).toISO() }}
={{ $now.plus({ months: 1 }).toISO() }}
={{ $now.startOf('month').toISO() }}
={{ $now.endOf('week').toISO() }}

// Verschil berekenen
={{ $now.diff($json.created_at, 'days').days }}
```

### Parsing
```javascript
// String naar DateTime
={{ DateTime.fromISO($json.date_string) }}
={{ DateTime.fromFormat($json.date, 'dd-MM-yyyy') }}
```

---

## Array Operaties

### Map
```javascript
// Alle names uit array
={{ $json.items.map(item => item.name) }}

// Met transformatie
={{ $json.items.map(item => ({
  id: item.id,
  label: item.name.toUpperCase()
})) }}
```

### Filter
```javascript
// Filter op conditie
={{ $json.items.filter(item => item.status === 'active') }}

// Combineer met map
={{ $json.items
    .filter(item => item.value > 1000)
    .map(item => item.name) }}
```

### Reduce
```javascript
// Som van values
={{ $json.items.reduce((sum, item) => sum + item.value, 0) }}

// Groeperen
={{ $json.items.reduce((acc, item) => {
  acc[item.category] = acc[item.category] || [];
  acc[item.category].push(item);
  return acc;
}, {}) }}
```

### Find
```javascript
// Eerste match
={{ $json.items.find(item => item.id === $json.targetId) }}

// Check of bestaat
={{ $json.items.some(item => item.status === 'error') }}
```

---

## String Operaties

### Basis
```javascript
// Concatenatie
={{ $json.firstName + ' ' + $json.lastName }}

// Template literal
={{ `${$json.firstName} ${$json.lastName}` }}

// Lowercase/uppercase
={{ $json.name.toLowerCase() }}
={{ $json.code.toUpperCase() }}
```

### Manipulatie
```javascript
// Trim whitespace
={{ $json.input.trim() }}

// Replace
={{ $json.text.replace('old', 'new') }}
={{ $json.text.replaceAll('-', '_') }}

// Split
={{ $json.email.split('@')[1] }}  // domain

// Substring
={{ $json.id.substring(0, 8) }}
```

---

## Conditionele Logica

### Ternary Operator
```javascript
={{ $json.status === 'active' ? 'Actief' : 'Inactief' }}

// Genest
={{ $json.value > 1000
    ? 'Hoog'
    : $json.value > 500
      ? 'Medium'
      : 'Laag' }}
```

### Nullish Coalescing
```javascript
// Fallback voor null/undefined
={{ $json.name ?? 'Geen naam' }}

// Keten van fallbacks
={{ $json.nickname ?? $json.firstName ?? $json.email ?? 'Onbekend' }}
```

### Optional Chaining
```javascript
// Veilig navigeren door geneste objecten
={{ $json.company?.contact?.email ?? 'geen email' }}
```

---

## Debugging Tips

### 1. Log Tussenresultaten
Voeg een Code node toe met:
```javascript
console.log('Input:', $input.item.json);
return $input.item;
```

### 2. Check Type
```javascript
={{ typeof $json.value }}  // "string", "number", "object", etc.
={{ Array.isArray($json.items) }}  // true/false
```

### 3. Stringify voor Inspectie
```javascript
={{ JSON.stringify($json, null, 2) }}
```

### 4. Valideer voor Gebruik
```javascript
={{ $json.items?.length > 0 ? $json.items[0] : null }}
```

### 5. Error Catching
```javascript
// In Code node
try {
  return { result: $json.nested.deep.value };
} catch (e) {
  return { error: e.message, input: $json };
}
```

---

## Quick Reference Table

| Variabele | Beschrijving | Voorbeeld |
|-----------|-------------|-----------|
| `$json` | Output vorige node | `$json.id` |
| `$node["X"]` | Specifieke node output | `$node["Webhook"].json` |
| `$input` | Huidige input | `$input.all()` |
| `$env` | Environment vars | `$env.API_KEY` |
| `$now` | Huidige tijd | `$now.toISO()` |
| `$today` | Vandaag 00:00 | `$today.toISO()` |
| `$execution` | Execution info | `$execution.id` |
| `$workflow` | Workflow info | `$workflow.name` |

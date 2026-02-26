# Database Rules - Dirq Solutions CRM

> Regels voor Supabase, PostgreSQL en database-gerelateerde taken.

---

## Migrations

### Naamgeving
```
YYYYMMDD_beschrijvende_naam.sql
```

### Structuur
```sql
-- ============================================================
-- [TITEL]
-- Migration: YYYYMMDD_naam.sql
-- Purpose: [Beschrijving]
-- ============================================================

-- Altijd IF NOT EXISTS gebruiken
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column);

-- RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```

## Queries

### Foreign Key Ambiguïteit
```typescript
// FOUT - ambigue FK
.select('*, company:companies(*)')

// GOED - specifieke FK
.select('*, company:companies!quotes_company_id_fkey(*)')
```

### Relaties Ophalen
```typescript
const { data } = await supabase
  .from('quotes')
  .select(`
    *,
    company:companies!quotes_company_id_fkey(id, name, email),
    contact:contacts!quotes_contact_id_fkey(id, first_name, last_name),
    owner:profiles!quotes_owner_id_fkey(id, voornaam, achternaam)
  `)
  .eq('id', id)
  .single();
```

## RLS Policies

### Standaard Patronen
```sql
-- Users zien eigen data
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- Users maken eigen data
CREATE POLICY "Users can create own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins zien alles
CREATE POLICY "Admins can view all"
  ON table_name FOR SELECT
  USING (is_admin());
```

## Veelvoorkomende Errors

| Error | Oorzaak | Oplossing |
|-------|---------|-----------|
| PGRST204 | Column bestaat niet | Check spelling |
| PGRST201 | Ambigue FK | Specificeer FK naam |
| 403 Forbidden | RLS block | Check policy |
| 23505 | Duplicate key | Check unique constraints |

---

*Laatste update: 30 januari 2026*

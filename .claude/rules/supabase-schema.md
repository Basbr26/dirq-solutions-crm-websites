# Supabase Schema Rules - Stage Transities & Data-Integriteit

> Definities voor pipeline stages, toegestane transities en data-integriteit regels.

---

## Pipeline Stage Definities

### Lead Stages (projects.stage)

```
┌─────────┐    ┌───────────┐    ┌───────────────────┐    ┌────────────┐
│  lead   │ -> │ contacted │ -> │ meeting_scheduled │ -> │ quote_sent │
└─────────┘    └───────────┘    └───────────────────┘    └────────────┘
                                                                │
                                                                ▼
                                                        ┌──────────────┐
                                                        │ quote_signed │
                                                        └──────────────┘
                                                                │
                                                    ┌───────────┴───────────┐
                                                    ▼                       ▼
                                               ┌─────┐                 ┌──────┐
                                               │ won │                 │ lost │
                                               └─────┘                 └──────┘
```

### Stage Waarden
```sql
CHECK (stage IN (
  'lead',              -- Nieuw, nog niet gecontacteerd
  'contacted',         -- Eerste contact gemaakt
  'meeting_scheduled', -- Discovery call gepland
  'quote_sent',        -- Offerte verstuurd
  'quote_signed',      -- Offerte getekend
  'won',               -- Deal gewonnen, project gestart
  'lost'               -- Deal verloren
))
```

---

## Toegestane Stage Transities

### VERPLICHTE Transitie Regels

```sql
-- Functie voor validatie
CREATE OR REPLACE FUNCTION validate_stage_transition(
  old_stage TEXT,
  new_stage TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE
    -- Forward transitions
    WHEN old_stage = 'lead' AND new_stage IN ('contacted', 'lost') THEN TRUE
    WHEN old_stage = 'contacted' AND new_stage IN ('meeting_scheduled', 'lost') THEN TRUE
    WHEN old_stage = 'meeting_scheduled' AND new_stage IN ('quote_sent', 'contacted', 'lost') THEN TRUE
    WHEN old_stage = 'quote_sent' AND new_stage IN ('quote_signed', 'meeting_scheduled', 'lost') THEN TRUE
    WHEN old_stage = 'quote_signed' AND new_stage IN ('won', 'lost') THEN TRUE

    -- Terminal states (no transitions out)
    WHEN old_stage IN ('won', 'lost') THEN FALSE

    -- Same stage (no change)
    WHEN old_stage = new_stage THEN TRUE

    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql;
```

### Transitie Matrix

| Van ↓ / Naar → | lead | contacted | meeting | quote_sent | quote_signed | won | lost |
|----------------|------|-----------|---------|------------|--------------|-----|------|
| lead           | -    | ✅        | ❌      | ❌         | ❌           | ❌  | ✅   |
| contacted      | ❌   | -         | ✅      | ❌         | ❌           | ❌  | ✅   |
| meeting        | ❌   | ✅        | -       | ✅         | ❌           | ❌  | ✅   |
| quote_sent     | ❌   | ❌        | ✅      | -          | ✅           | ❌  | ✅   |
| quote_signed   | ❌   | ❌        | ❌      | ❌         | -            | ✅  | ✅   |
| won            | ❌   | ❌        | ❌      | ❌         | ❌           | -   | ❌   |
| lost           | ❌   | ❌        | ❌      | ❌         | ❌           | ❌  | -    |

---

## Company Status Transities

```sql
CHECK (status IN (
  'prospect',   -- Potentiële klant
  'active',     -- Actieve klant met projecten
  'inactive',   -- Geen actieve projecten
  'churned'     -- Voormalige klant, opgezegd
))
```

### Toegestane Transities
```
prospect -> active    (eerste project gewonnen)
active -> inactive    (alle projecten afgerond)
inactive -> active    (nieuw project gestart)
active -> churned     (klant opgezegd)
inactive -> churned   (klant definitief weg)
```

---

## Quote Status & Sign Status

### Quote Status
```sql
CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired'))
```

### Sign Status
```sql
CHECK (sign_status IN ('pending', 'sent', 'signed', 'rejected'))
```

### Relatie Matrix
| quote.status | Toegestane sign_status |
|--------------|------------------------|
| draft        | pending                |
| sent         | pending, sent          |
| accepted     | signed                 |
| declined     | rejected               |
| expired      | pending, sent          |

---

## Data-Integriteit Regels

### 1. Referentiële Integriteit
```sql
-- Contacts MOETEN bij een company horen
ALTER TABLE contacts
  ADD CONSTRAINT contacts_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id)
  ON DELETE CASCADE;

-- Projects MOETEN een owner hebben
ALTER TABLE projects
  ADD CONSTRAINT projects_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id)
  ON DELETE RESTRICT;
```

### 2. Verplichte Velden per Stage

| Stage | Verplichte Velden |
|-------|-------------------|
| lead | company_id, title |
| contacted | + contact_id, owner_id |
| meeting_scheduled | + interaction met type='meeting' |
| quote_sent | + quote_id |
| quote_signed | + quote.sign_status='signed' |
| won | + quote.status='accepted' |

### 3. Automatische Updates
```sql
-- Bij stage 'won': update company.status naar 'active'
CREATE OR REPLACE FUNCTION on_project_won()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage = 'won' AND OLD.stage != 'won' THEN
    UPDATE companies
    SET status = 'active'
    WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4. MRR Berekening
```sql
-- total_mrr op companies wordt automatisch berekend
-- uit gekoppelde projects met mrr > 0 en stage = 'won'
```

---

## Validatie Triggers

### Stage Transitie Trigger
```sql
CREATE OR REPLACE FUNCTION enforce_stage_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_stage_transition(OLD.stage, NEW.stage) THEN
    RAISE EXCEPTION 'Invalid stage transition from % to %',
      OLD.stage, NEW.stage;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_stage_transition
  BEFORE UPDATE OF stage ON projects
  FOR EACH ROW
  EXECUTE FUNCTION enforce_stage_transition();
```

---

## Checklist voor Schema Wijzigingen

- [ ] Stage waarden in CHECK constraint
- [ ] Transitie regels in validate functie
- [ ] Trigger voor enforcement
- [ ] Cascading updates waar nodig
- [ ] RLS policies bijgewerkt
- [ ] TypeScript types gesynchroniseerd

---

*Laatste update: 30 januari 2026*

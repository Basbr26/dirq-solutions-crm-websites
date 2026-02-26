# Security Rules - Dirq Solutions CRM

> Beveiligingsregels en compliance richtlijnen.

---

## Credentials & Secrets

- Nooit credentials in code of commits
- Gebruik `.env` voor lokale secrets
- Environment variables in productie via hosting platform

## Row Level Security (RLS)

Alle tabellen MOETEN RLS hebben:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```

## Data Access

- Users kunnen alleen eigen data zien (tenzij admin)
- `is_admin()` function voor admin checks
- Audit logging voor gevoelige acties

## MCP Security

- Activeer alleen noodzakelijke toolsets
- Gebruik `project_ref` voor project-isolatie
- `read_only=true` voor analytische taken

## Input Validatie

- Zod schemas voor form validation
- Sanitize user input voor database
- Escape HTML in user-generated content

---

*Laatste update: 30 januari 2026*

# Automatische Project Status Updates via Offertes

## 🎯 Wat is geïmplementeerd

Een database trigger die **automatisch** de project/pipeline status update op basis van offerte wijzigingen.

---

## ✅ Automatische Status Updates

| Offerte Actie | Quote Status | Project Stage | Pipeline Kolom | Probability |
|---------------|--------------|---------------|----------------|-------------|
| **Offerte verzenden** (email) | `status = sent` | → `quote_sent` | "Offerte Verzonden" | 40% |
| **Sign link verzenden** | `sign_status = sent` | → `quote_sent` | "Offerte Verzonden" | 40% |
| **Handmatig accepteren** | `status = accepted` | → `quote_signed` | "Quote Getekend" | 90% |
| **Digitaal getekend** | `sign_status = signed` | → `quote_signed` | "Quote Getekend" | 90% |
| **Offerte afgewezen** | `status = rejected` | → `lost` | (niet in pipeline) | 0% |

---

## 🎬 Voorbeeld Flow

### Scenario 1: Digitale Handtekening
```
1. 📝 Create offerte in CRM
   → project.stage = lead (geen wijziging)

2. 📧 Klik "Verstuur Sign Link"
   → quote.sign_status = sent
   → TRIGGER: project.stage → quote_sent
   → Pipeline: project verschijnt in "Offerte Verzonden" kolom

3. ✍️ Klant tekent offerte digitaal
   → quote.sign_status = signed
   → TRIGGER: project.stage → quote_signed  
   → Pipeline: project verschijnt in "Quote Getekend" kolom
```

### Scenario 2: Handmatige Acceptatie
```
1. 📝 Create offerte in CRM
   → project.stage = lead

2. 📧 Change status naar "Verzonden"
   → quote.status = sent
   → TRIGGER: project.stage → quote_sent

3. ✅ Change status naar "Geaccepteerd"
   → quote.status = accepted
   → TRIGGER: project.stage → quote_signed
```

---

## 🛡️ Bescherming

De trigger is **slim** en voorkomt ongewenste downgrades:

```sql
-- ✅ SAFE: Offerte verzonden terwijl project al in_development
IF current_stage = 'in_development' THEN
  -- Geen update! Project blijft in_development
END IF

-- ✅ SAFE: Offerte getekend terwijl project al live
IF current_stage = 'live' THEN
  -- Geen update! Project blijft live
END IF
```

**Stages die NIET worden gedowngraded:**
- `quote_signed`
- `in_development`
- `review`
- `live`
- `maintenance`

---

## 📋 Database Trigger Details

### Functie
```sql
update_project_on_quote_status_change()
```

### Trigger Event
```sql
AFTER UPDATE OF status, sign_status ON quotes
```

### Logica
1. Check of quote gelinkt is aan project
2. Haal huidige project stage op
3. Bepaal nieuwe stage op basis van quote status wijziging
4. Update project ALLEEN als het geen downgrade is
5. Log wijziging via RAISE NOTICE

---

## 🚀 Deployment

### Deploy via Supabase CLI
```bash
supabase db push
```

### Handmatige Deploy (Supabase Dashboard)
1. Ga naar **Database** → **SQL Editor**
2. Open `20260115_auto_update_project_on_quote_signed.sql`
3. Kopieer en plak in SQL Editor
4. Klik **Run**

---

## 🧪 Testen

### Test 1: Offerte Verzenden
```sql
-- Maak test quote aan (linked aan project)
INSERT INTO quotes (company_id, project_id, quote_number, title, status)
VALUES ('company-id', 'project-id', 'Q-TEST-001', 'Test Quote', 'draft');

-- Verzend offerte
UPDATE quotes SET status = 'sent' WHERE quote_number = 'Q-TEST-001';

-- Verifieer project update
SELECT p.title, p.stage, p.probability 
FROM projects p
WHERE p.id = 'project-id';
-- Verwacht: stage = 'quote_sent', probability = 40
```

### Test 2: Digitale Handtekening
```sql
-- Teken offerte
UPDATE quotes 
SET sign_status = 'signed', signed_at = NOW()
WHERE quote_number = 'Q-TEST-001';

-- Verifieer project update
SELECT p.title, p.stage, p.probability 
FROM projects p
WHERE p.id = 'project-id';
-- Verwacht: stage = 'quote_signed', probability = 90
```

### Test 3: Beveiliging - Geen Downgrade
```sql
-- Zet project naar advanced stage
UPDATE projects SET stage = 'live' WHERE id = 'project-id';

-- Probeer offerte te verzenden (zou normaal naar quote_sent gaan)
UPDATE quotes SET status = 'sent' WHERE quote_number = 'Q-TEST-001';

-- Verifieer project NIET gedowngraded
SELECT p.title, p.stage FROM projects p WHERE p.id = 'project-id';
-- Verwacht: stage = 'live' (NIET gewijzigd!)
```

---

## 🔍 Monitoring

### Check Trigger Logs
Triggers loggen hun acties via `RAISE NOTICE`:

```sql
-- In Supabase logs zie je:
📧 Quote Q-2026-001 sent → moving project to quote_sent stage
✅ Project abc-123 automatically updated to quote_sent (probability: 40%)
```

### Verify Trigger Exists
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'quote_status_update_project';
```

---

## 🎉 Voordelen

### Voor Sales Team
- ✅ **Geen handmatig slepen** meer in pipeline
- ✅ **Real-time updates** - pipeline is altijd actueel
- ✅ **Minder vergissingen** - geen handmatige fouten

### Voor Management
- ✅ **Accurate reporting** - pipeline data is betrouwbaar
- ✅ **Real-time visibility** - zie direct wanneer deals getekend worden
- ✅ **Audit trail** - elke wijziging is getraceerd

### Voor Klanten
- ✅ **Snellere follow-up** - sales ziet direct getekende offertes
- ✅ **Betere communicatie** - juiste status = juiste actie

---

## 🐛 Troubleshooting

### Trigger werkt niet?
```sql
-- Check of trigger actief is
SELECT * FROM pg_trigger WHERE tgname = 'quote_status_update_project';

-- Check functie bestaat
SELECT * FROM pg_proc WHERE proname = 'update_project_on_quote_status_change';
```

### Project wordt niet geupdate?
**Mogelijke oorzaken:**
1. Quote niet gelinkt aan project (`project_id IS NULL`)
2. Project al in advanced stage (beveiliging)
3. RLS policies blokkeren update
4. Quote status wijziging niet gedetecteerd

**Debug:**
```sql
-- Check quote-project link
SELECT q.quote_number, q.status, q.sign_status, q.project_id, p.stage
FROM quotes q
LEFT JOIN projects p ON q.project_id = p.id
WHERE q.quote_number = 'Q-2026-XXX';
```

### Ongewenste updates?
Als de trigger te agressief is, pas aan:
```sql
-- Disable trigger
ALTER TABLE quotes DISABLE TRIGGER quote_status_update_project;

-- Enable trigger
ALTER TABLE quotes ENABLE TRIGGER quote_status_update_project;
```

---

## 📚 Related Files

- `supabase/migrations/20260115_auto_update_project_on_quote_signed.sql` - Migration file
- `src/features/quotes/QuoteDetailPage.tsx` - Quote UI
- `src/pages/PublicSignQuotePage.tsx` - Digital signing
- `src/features/projects/PipelinePage.tsx` - Pipeline view

---

## 🔄 Rollback

Als je de trigger wilt verwijderen:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS quote_status_update_project ON quotes;

-- Remove function
DROP FUNCTION IF EXISTS update_project_on_quote_status_change();
```

---

## ✨ Toekomstige Uitbreidingen

Mogelijke verbeteringen:
- [ ] Notificatie naar sales bij getekende offerte
- [ ] Automatisch factuur genereren bij getekende offerte
- [ ] Slack/Teams webhook bij milestone
- [ ] Email naar klant bij status wijziging
- [ ] Analytics dashboard voor conversion rates

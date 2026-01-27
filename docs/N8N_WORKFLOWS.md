# Dirq CRM Automation - n8n Workflows

## Overzicht

Dit document beschrijft de 28 n8n workflows die zijn ingericht voor de Dirq Websites CRM automatisering.

**n8n Instance:** https://dirqsolutions.app.n8n.cloud/

---

## Geinstalleerde Workflows

### Fase 1 - Basis Automatisering (01-10)

| # | Workflow | ID | Trigger | Status |
|---|----------|-----|---------|--------|
| 01 | Daily Pipeline Health Check | `T5ChnkoCfxdARs8x` | Cron 09:00 | Inactief |
| 02 | Quote Expiration Alerts | `elPA8fNbJWFrnF2F` | Cron 10:00 | Inactief |
| 03 | Stale Lead Revival | `zMgqvL5BM6ubb2bn` | Cron 11:00 | Inactief |
| 04 | Google Calendar to CRM Sync | `s1ktyH4Oq4k2W3BW` | Calendar Event | Inactief |
| 05 | CRM to Google Calendar Sync | `uMa0SAnIDvkBm08y` | Webhook | Inactief |
| 06 | Pre-Meeting Reminders | `xI9PKq9Oe1in7EsD` | Cron (hourly) | Inactief |
| 07 | Project Onboarding Sequence | `4fdaElK1IhLLiZm5` | Webhook | Inactief |
| 08 | Daily Task Reminders | `NaHL6cYxDn8dCu76` | Cron 08:00 | Inactief |
| 09 | AI Quote Builder | `VdkKZPX36pRvqSnM` | Webhook | Inactief |
| 10 | Company Data Enrichment | `Mj9wyZY0PvElaYZ5` | Webhook | Inactief |

### Fase 2 - Lead & Sales Automation (11-14)

| # | Workflow | ID | Trigger | Status |
|---|----------|-----|---------|--------|
| 11 | Video Audit Reminder | `GRLVbbGfBCYPtKM1` | Cron 09:00 | Inactief |
| 12 | Discovery Call No-Show | `b0JjdUbfc3dJV7xv` | Cron 10:00 | Inactief |
| 13 | Lead Scoring Update | `Vm1DjkcsbmdJjoe6` | Webhook | Inactief |
| 14 | Hot Lead Alert | `dyDuYGkt49ccuN1w` | Cron 09:30 | Inactief |

### Fase 2 - Deal Management (15-18)

| # | Workflow | ID | Trigger | Status |
|---|----------|-----|---------|--------|
| 15 | Deal Won Automation | `kolaeOjDRHQmDMfb` | Webhook | Inactief |
| 16 | Lost Deal Analysis | `AUS2droW9DHa9Km2` | Webhook | Inactief |
| 17 | Deal Probability Alert | `4TOmjjvyhJV63mli` | Cron 08:00 | Inactief |
| 18 | Revenue Forecast Report | `LNBOmMDkhleQ0BAX` | Cron Maandag 07:00 | Inactief |

### Fase 2 - Subscription & Revenue (19-22)

| # | Workflow | ID | Trigger | Status |
|---|----------|-----|---------|--------|
| 19 | Payment Reminder | `SZEKU9YLDleLPVQu` | Cron 09:00 | Inactief |
| 20 | Past Due Alert | `qfvOFCOCibrsKelq` | Cron 10:00 | Inactief |
| 21 | Churn Prevention | `75JgnHufUukMfNeT` | Cron 11:00 | Inactief |
| 22 | MRR Dashboard Update | `uVoiczJ2r2N1VqUM` | Cron 06:00 | Inactief |

### Fase 2 - Project & Website (23-25)

| # | Workflow | ID | Trigger | Status |
|---|----------|-----|---------|--------|
| 23 | Project Milestone Check | `i3a14j2MSyA50jKt` | Cron 08:00 | Inactief |
| 24 | Website Launch Sequence | `wA8NjWARrfN3gNgw` | Webhook | Inactief |
| 25 | Maintenance Reminder | `npMYnvXgSN43REk7` | Cron Maandag 09:00 | Inactief |

### Fase 2 - Customer Success (26-28)

| # | Workflow | ID | Trigger | Status |
|---|----------|-----|---------|--------|
| 26 | Anniversary Email | `D6CpNbstbCJysIlB` | Cron 08:00 | Inactief |
| 27 | NPS Survey | `4xqlzFBFrTcPZDTW` | Cron 10:00 | Inactief |
| 28 | Referral Request | `KgESuQpte9HNFZo3` | Webhook | Inactief |

---

## Setup Instructies

### Stap 1: Credentials Configureren

Ga naar n8n > **Credentials** en configureer de volgende credentials:

#### 1.1 Supabase
- **Type:** Supabase
- **Name:** `Dirq Supabase`
- **Host:** [jouw-supabase-url].supabase.co
- **Service Role Key:** Te vinden in Supabase > Settings > API

#### 1.2 Gemini API
- **Type:** HTTP Header Auth
- **Name:** `Gemini API`
- **Header Name:** `x-goog-api-key`
- **Header Value:** [jouw Gemini API key van aistudio.google.com]

#### 1.3 Resend Email
- **Type:** Resend API
- **Name:** `Resend`
- **API Key:** [jouw Resend API key]

#### 1.4 Google Calendar
- **Type:** Google Calendar OAuth2
- **Name:** `Google Calendar OAuth2`
- **Client ID:** [van Google Cloud Console]
- **Client Secret:** [van Google Cloud Console]
- Klik "Connect my account" en autoriseer

#### 1.5 KVK API
- **Type:** HTTP Header Auth
- **Name:** `KVK API`
- **Header Name:** `apikey`
- **Header Value:** [jouw KVK API key]

---

### Stap 2: Database Tabellen Aanmaken

Voer deze SQL queries uit in Supabase SQL Editor:

```sql
-- Tasks tabel
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('low','medium','high','urgent')),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id),
  created_by_automation BOOLEAN DEFAULT FALSE,
  automation_workflow_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions uitbreiding
ALTER TABLE interactions
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS google_meet_link TEXT,
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Companies uitbreiding
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS enrichment_data JSONB,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS kvk_number TEXT;

-- Email drafts tabel
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'draft',
  type TEXT,
  quote_id UUID,
  project_id UUID,
  lead_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications tabel
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  message TEXT,
  type TEXT,
  priority TEXT DEFAULT 'medium',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Websites uitbreiding voor NPS
ALTER TABLE websites
ADD COLUMN IF NOT EXISTS nps_score INTEGER,
ADD COLUMN IF NOT EXISTS last_maintenance_date TIMESTAMPTZ;

-- Lead scoring veld
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
```

---

### Stap 3: Workflows Activeren

1. Ga naar https://dirqsolutions.app.n8n.cloud/
2. Open elke workflow
3. Klik op de rode credential nodes en koppel de juiste credentials
4. Test de workflow met "Execute Workflow"
5. Als succesvol, zet de toggle "Active" aan

---

## Workflow Details

### Fase 1 Workflows

#### 01 - Daily Pipeline Health Check
**Doel:** Analyseert deals die binnen 7 dagen sluiten en geeft AI-powered aanbevelingen.

**Trigger:** Dagelijks om 09:00

**Flow:**
1. Query projects in negotiation/quote stages
2. Stuur naar Gemini voor risicoanalyse
3. Maak notificatie aan in CRM

---

#### 02 - Quote Expiration Alerts
**Doel:** Stuurt follow-up emails voor offertes die bijna verlopen.

**Trigger:** Dagelijks om 10:00

**Flow:**
1. Query offertes die binnen 3 dagen verlopen
2. Genereer gepersonaliseerde email via Gemini
3. Sla op als draft in email_drafts tabel

---

#### 03 - Stale Lead Revival
**Doel:** Re-engagement emails voor leads die >10 dagen inactief zijn.

**Trigger:** Dagelijks om 11:00

---

#### 04 - Google Calendar to CRM Sync
**Doel:** Synchroniseert nieuwe calendar events naar CRM interactions.

**Trigger:** Bij nieuwe/gewijzigde calendar event

---

#### 05 - CRM to Google Calendar Sync
**Doel:** Maakt calendar events aan vanuit CRM.

**Webhook URL:** `https://dirqsolutions.app.n8n.cloud/webhook/crm-to-calendar`

---

#### 06 - Pre-Meeting Reminders
**Doel:** Stuurt meeting prep docs 24 uur voor meetings.

**Trigger:** Elk uur (checkt meetings in 23-24h window)

---

#### 07 - Project Onboarding Sequence
**Doel:** Maakt automatisch 7 onboarding taken aan bij gewonnen project.

**Webhook URL:** `https://dirqsolutions.app.n8n.cloud/webhook/project-won`

---

#### 08 - Daily Task Reminders
**Doel:** Dagelijkse herinnering van taken die vandaag due zijn.

**Trigger:** Dagelijks om 08:00

---

#### 09 - AI Quote Builder
**Doel:** Genereert offerte line items met AI.

**Webhook URL:** `https://dirqsolutions.app.n8n.cloud/webhook/generate-quote`

---

#### 10 - Company Data Enrichment
**Doel:** Verrijkt bedrijfsdata via KVK API en haalt logo's op.

**Webhook URL:** `https://dirqsolutions.app.n8n.cloud/webhook/company-created`

---

### Fase 2 Workflows

#### 11 - Video Audit Reminder
**Doel:** Herinnert leads die 48+ uur geleden een video audit hebben ontvangen maar geen reactie hebben gegeven.

**Trigger:** Dagelijks om 09:00

**Flow:**
1. Query leads met status VIDEO_AUDIT_SENT en geen activiteit >48 uur
2. Maak follow-up notificatie aan

---

#### 12 - Discovery Call No-Show
**Doel:** Detecteert gemiste discovery calls en plant automatisch een reschedule.

**Trigger:** Dagelijks om 10:00

**Flow:**
1. Query leads in DISCOVERY_CALL stage met geplande call in verleden
2. Check of er geen opvolgende activiteit is
3. Maak herplannings-taak aan

---

#### 13 - Lead Scoring Update
**Doel:** Berekent en updatet lead scores gebaseerd op engagement en bedrijfsdata.

**Webhook URL:** `https://dirqsolutions.app.n8n.cloud/webhook/calculate-lead-score`

**Scoring Model:**
- Website status: +10-50 punten
- Budget: +10-40 punten
- Bedrijfsgrootte: +5-30 punten
- Engagement: +5-20 punten

---

#### 14 - Hot Lead Alert
**Doel:** Stuurt direct alert wanneer een lead score >80 bereikt.

**Trigger:** Dagelijks om 09:30

**Flow:**
1. Query leads met score >80
2. Stuur urgente notificatie
3. Log activiteit

---

#### 15 - Deal Won Automation
**Doel:** Triggert wanneer een deal naar WON status gaat - start onboarding sequence.

**Webhook URL:** `https://dirqsolutions.app.n8n.cloud/webhook/deal-won`

**Flow:**
1. Update deal status
2. Maak project aan
3. Start onboarding taken

---

#### 16 - Lost Deal Analysis
**Doel:** Analyseert verloren deals en slaat redenen op voor rapportage.

**Webhook URL:** `https://dirqsolutions.app.n8n.cloud/webhook/deal-lost`

**Flow:**
1. Registreer verlies reden
2. Genereer AI analyse
3. Maak follow-up taak voor win-back

---

#### 17 - Deal Probability Alert
**Doel:** Alert voor deals met lage probability (<30%) die aandacht nodig hebben.

**Trigger:** Dagelijks om 08:00

**Flow:**
1. Query deals met probability <30%
2. Genereer actie-aanbevelingen
3. Maak notificatie aan

---

#### 18 - Revenue Forecast Report
**Doel:** Wekelijks revenue forecast rapport gebaseerd op pipeline.

**Trigger:** Elke maandag om 07:00

**Flow:**
1. Aggregeer deal waarden per stage
2. Bereken gewogen forecast
3. Maak rapport notificatie

---

#### 19 - Payment Reminder
**Doel:** Herinnert klanten 3 dagen voor vervaldatum van factuur.

**Trigger:** Dagelijks om 09:00

**Flow:**
1. Query subscriptions met next_billing_date binnen 3 dagen
2. Maak email draft aan
3. Log activiteit

---

#### 20 - Past Due Alert
**Doel:** Alert voor betalingen die te laat zijn.

**Trigger:** Dagelijks om 10:00

**Flow:**
1. Query subscriptions met status PAST_DUE
2. Maak urgente notificatie
3. Maak follow-up taak

---

#### 21 - Churn Prevention
**Doel:** Detecteert risico op churn en triggert preventie acties.

**Trigger:** Dagelijks om 11:00

**Flow:**
1. Query subscriptions met status PAUSED of PAST_DUE
2. Maak retentie email draft
3. Maak call-taak voor account manager

---

#### 22 - MRR Dashboard Update
**Doel:** Dagelijkse update van MRR metrics.

**Trigger:** Dagelijks om 06:00

**Flow:**
1. Aggregeer actieve subscription revenue
2. Bereken MRR, ARR, groei
3. Sla op als notification voor dashboard

---

#### 23 - Project Milestone Check
**Doel:** Checkt projecten op gemiste milestones en deadlines.

**Trigger:** Dagelijks om 08:00

**Flow:**
1. Query projecten met deadline in verleden
2. Check op incomplete taken
3. Maak alert notificatie

---

#### 24 - Website Launch Sequence
**Doel:** Automatiseert post-launch taken wanneer website live gaat.

**Webhook URL:** `https://dirqsolutions.app.n8n.cloud/webhook/website-launched`

**Flow:**
1. Update website status naar LIVE
2. Update lead status naar ACTIVE_CLIENT
3. Maak congratulatie email draft
4. Plan NPS survey voor +30 dagen

---

#### 25 - Maintenance Reminder
**Doel:** Wekelijkse check voor websites die onderhoud nodig hebben.

**Trigger:** Elke maandag om 09:00

**Flow:**
1. Query websites met last_maintenance_date >30 dagen
2. Maak notificatie per website
3. Log maintenance reminder activiteit

---

#### 26 - Anniversary Email
**Doel:** Stuurt 1-jarig jubileum email naar klanten.

**Trigger:** Dagelijks om 08:00

**Flow:**
1. Query websites met go_live_date exact 1 jaar geleden
2. Maak gepersonaliseerde anniversary email draft

---

#### 27 - NPS Survey
**Doel:** Stuurt NPS survey 30 dagen na website launch.

**Trigger:** Dagelijks om 10:00

**Flow:**
1. Query websites gelanceerd 30 dagen geleden zonder NPS score
2. Maak NPS survey email draft
3. Log activiteit

---

#### 28 - Referral Request
**Doel:** Vraagt tevreden klanten (NPS >8) om referrals.

**Webhook URL:** `https://dirqsolutions.app.n8n.cloud/webhook/nps-received`

**Flow:**
1. Ontvang NPS score via webhook
2. Als score >8, maak referral request email
3. Update website met NPS score
4. Log activiteit

---

## Webhook URLs Overzicht

| Workflow | Webhook URL |
|----------|-------------|
| 05 - Calendar Sync | `/webhook/crm-to-calendar` |
| 07 - Onboarding | `/webhook/project-won` |
| 09 - Quote Builder | `/webhook/generate-quote` |
| 10 - Enrichment | `/webhook/company-created` |
| 13 - Lead Scoring | `/webhook/calculate-lead-score` |
| 15 - Deal Won | `/webhook/deal-won` |
| 16 - Deal Lost | `/webhook/deal-lost` |
| 24 - Website Launch | `/webhook/website-launched` |
| 28 - NPS Received | `/webhook/nps-received` |

---

## Monitoring

### Dagelijkse Check (5 min)
1. Open n8n > Executions
2. Check success rate (doel: >95%)
3. Review errors indien aanwezig

### Wekelijkse Review
1. Spot check 3 gegenereerde emails
2. Evalueer kwaliteit (doel: 8+/10)
3. Pas prompts aan indien nodig

---

## Troubleshooting

### "Credential not found"
- Ga naar de workflow
- Klik op de rode node
- Selecteer de juiste credential

### "Supabase query failed"
- Check of de tabel bestaat
- Verifieer kolom namen
- Check RLS policies in Supabase

### "Gemini timeout"
- Verhoog timeout in HTTP Request node
- Check API quota in Google Cloud Console

### "Calendar event niet aangemaakt"
- Re-authorize Google Calendar credential
- Check of calendar ID correct is ("primary")

---

## Volgende Stappen

1. **Week 1:** Test alle Fase 1 workflows (01-10) in draft mode
2. **Week 2:** Test Fase 2 workflows (11-28)
3. **Week 3-4:** Review email kwaliteit, tune AI prompts
4. **Maand 2:** Schakel over naar auto mode voor stabiele workflows
5. **Maand 3+:** Overweeg Fase 3 (Apollo integratie, advanced AI scoring, predictive analytics)

---

## Support

Voor vragen of problemen:
- n8n Documentation: https://docs.n8n.io
- Supabase Documentation: https://supabase.com/docs

---

*Gegenereerd door Claude Code - Dirq Solutions CRM Automation Setup*  
*Totaal: 28 workflows geïmporteerd*  
*Datum: 16 januari 2026*

# Dirq Solutions CRM - Todo List

**Laatst bijgewerkt:** 12 Februari 2026 (sessie 4 - Quick Wins)

---in

## Afgerond

### CRUD Tools (Priority 2)
- [x] Company Creator tool bouwen (`IH23dZsK4RRkBV49`)
- [x] Contact Creator tool bouwen (`WXwNJALgFmRiAOdW`)
- [x] Project Creator tool bouwen (`Zu8kSF0lcjsXVw0q`)
- [x] CRUD tools koppelen aan main chatbot
- [x] Alle CRUD tool workflows activeren

### Email & Calendar Integratie (Priority 3)
- [x] Gmail Tool toevoegen aan chatbot
- [x] Google Calendar Tool toevoegen aan chatbot
- [x] Tools koppelen aan AI Agent

### ATC Email Workflows (Priority 3.5) - NIEUW
- [x] Email - Welcome New Lead (`R4uJGHHzyxjIXBWe`)
- [x] Email - Services Introduction (`1N9CxcJRFDGVblCm`)
- [x] Email - Meeting Follow-up (`cVq1JXPTEjAOy48G`)
- [x] Email - Quote Reminder (`ioDVapSsX6ZatBkL`)
- [x] Email - Project Update (`USIxHlljaEeoFbPT`)
- [x] Email - Win Celebration (`ZiW9KgYqz0neAWaC`)
- [x] ATC Email Dispatcher (`3mgw9CvfdnjHtS6Q`) - Routes events to email workflows

### Monitoring & Alerting (Priority 5) - NIEUW
- [x] Error Alerter workflow (`pryo6BXKL2poichX`) - Slack alerts
- [x] Daily Metrics Digest (`NOT3HJmJbNAB3ugi`) - ⚠️ ACTIVEREN IN N8N UI
- [x] Gekoppeld aan ATC error handling

### Lead Enrichment (Priority 4.1) - NIEUW
- [x] KVK Lead Enrichment workflow (`JWKw1gqpPmvZkrFH`)
- [x] KVK Enrichment Tool gekoppeld aan chatbot
- [ ] KVK workflow ACTIVEREN in n8n UI (vereist voor ATC koppeling)
- [ ] KVK API credential aanmaken (developers.kvk.nl)

### Extra CRUD Tools (Priority 2.5) - NIEUW
- [x] Quote Creator tool (`mCYK5yFun4i0L94P`)
- [x] Company Editor tool (`QNK7P7vUftF5FXbV`)
- [x] Contact Editor tool (`VLEtOMFWmOUGf17J`)
- [x] Tools gekoppeld aan chatbot

---

## In Progress / Actie Vereist

### ATC Quick Wins (4 workflows) - NIEUW 12 Feb 2026
- [x] Quote Viewed Tracker workflow gebouwd (`ZvcMTnmXNANUCxO6`)
- [x] Daily Sales Digest (08:30) workflow gebouwd (`5EiXrfP7vC6ELaSV`)
- [x] Win/Loss Alerts workflow gebouwd (`nUaxAbWBt9TVZUf5`)
- [x] Project Milestone Tracker workflow gebouwd (`2vbIwhKnDyV1CdGK`)
- [ ] **ACTIVEREN:** Alle 4 workflows activeren in n8n UI
- [ ] **CREDENTIALS:** Supabase + Resend Header Auth koppelen (kopieer van ATC)
- [ ] **SQL:** Database triggers uitvoeren in Supabase (zie hieronder)

### OAuth2 Credentials Setup
- [ ] Google Cloud Project aanmaken/selecteren
- [ ] Gmail API enablen
- [ ] Google Calendar API enablen
- [ ] OAuth2 credentials aanmaken (Client ID + Secret)
- [ ] Redirect URI configureren voor n8n
- [ ] Gmail OAuth2 credential toevoegen in n8n
- [ ] Google Calendar OAuth2 credential toevoegen in n8n
- [ ] Credentials koppelen aan Gmail Tool en Calendar Tool nodes

---

## Nog Te Doen

### Priority 1: Context Awareness Testen
- [ ] Test: "Welke bedrijven?" → "Welke contacten?" (zonder "van welk bedrijf?")
- [ ] Test: "Zoek Dirq Solutions" → "Welke projecten?" (automatisch company context)
- [ ] Test: "Welke offertes?" → "Verander status" (automatisch quote context)
- [ ] Documenteer testresultaten

### Priority 4: ATC Pipeline Uitbreidingen

#### 4.1 Lead Enrichment Pipeline - ✅ COMPLEET
- [x] KVK API integratie workflow gebouwd (`JWKw1gqpPmvZkrFH`)
- [x] Gekoppeld aan chatbot als tool
- [x] Apollo.io Lead Enrichment workflow gebouwd (`g4ymtW42N55cS99N`)
- [x] Apollo Enrichment Tool gekoppeld aan chatbot
- [ ] Apollo.io API credential aanmaken (apollo.io/signup)
- [ ] KVK API credential aanmaken (developers.kvk.nl)

#### 4.2 LinkedIn Automation (Voorzichtig!)
- [ ] LinkedIn automation strategie bepalen
- [ ] Rate limiting implementeren (<100 connections/week)
- [ ] Account warm-up plan (2-4 weken)
- [ ] Multi-channel outreach sequence ontwerpen

### Priority 5: Monitoring & Alerting - ✅ DONE
- [x] Slack webhook voor kritieke fouten (`pryo6BXKL2poichX`)
- [x] Error rate tracking via ATC
- [x] Dagelijkse email digest met metrics (`NOT3HJmJbNAB3ugi`)
- [ ] Token usage monitoring (future)

---

## Workflow Overzicht

### Actieve Workflows (Main)
| ID | Naam | Nodes | Status |
|----|------|-------|--------|
| `lo0RW5Sw4UHXnMpr` | AI Chat Handler - CRM Chatbot | 44 | Active |
| `IGMxMoXs4v04waOb` | ATC Orchestrator | 23 | Active |

### Tool Workflows
| ID | Naam | Status |
|----|------|--------|
| `XQf7VeIJpPTS0DK9` | Tool - Company Lister | Active |
| `3NB62GbMdtvqwzc5` | Tool - Contact Lister | Active |
| `rpbHzxjBd0OPQnh2` | Tool - Project Searcher | Active |
| `6XqXlDyKL6Si00LN` | Tool - Quote Status Checker | Active |
| `SF3Jhv5PwGri3MD3` | Tool - Quote Status Changer | Active |
| `OXoHn2dPYWc1mPXm` | Tool - Stage Transitioner | Active |
| `IH23dZsK4RRkBV49` | Tool - Company Creator | Active |
| `WXwNJALgFmRiAOdW` | Tool - Contact Creator | Active |
| `Zu8kSF0lcjsXVw0q` | Tool - Project Creator | Active |
| `mCYK5yFun4i0L94P` | Tool - Quote Creator | Active |
| `QNK7P7vUftF5FXbV` | Tool - Company Editor | Active |
| `VLEtOMFWmOUGf17J` | Tool - Contact Editor | Active |
| `JWKw1gqpPmvZkrFH` | Tool - Lead Enrichment (KVK) | ⚠️ Activeren |
| `g4ymtW42N55cS99N` | Tool - Lead Enrichment (Apollo) | ⚠️ Activeren |

### Monitoring Workflows
| ID | Naam | Status |
|----|------|--------|
| `pryo6BXKL2poichX` | Monitoring - Error Alerter | Active |
| `NOT3HJmJbNAB3ugi` | Monitoring - Daily Metrics Digest | ⚠️ Activeren |

### ATC Sub-workflows
| ID | Naam | Status |
|----|------|--------|
| `3mgw9CvfdnjHtS6Q` | ATC Email Dispatcher | Active |
| `ZvcMTnmXNANUCxO6` | ATC - Quote Viewed Tracker | ⚠️ Activeren |
| `5EiXrfP7vC6ELaSV` | ATC - Daily Sales Digest (08:30) | ⚠️ Activeren |
| `nUaxAbWBt9TVZUf5` | ATC - Win/Loss Alerts | ⚠️ Activeren |
| `2vbIwhKnDyV1CdGK` | ATC - Project Milestone Tracker | ⚠️ Activeren |

### Email Workflows (ATC)
| ID | Naam | Status |
|----|------|--------|
| `R4uJGHHzyxjIXBWe` | Email - Welcome New Lead | Active |
| `1N9CxcJRFDGVblCm` | Email - Services Introduction | Active |
| `cVq1JXPTEjAOy48G` | Email - Meeting Follow-up | Active |
| `ioDVapSsX6ZatBkL` | Email - Quote Reminder | Active |
| `USIxHlljaEeoFbPT` | Email - Project Update | Active |
| `ZiW9KgYqz0neAWaC` | Email - Win Celebration | Active |

### Native AI Tools (in Chatbot)
- Gmail Tool (needs OAuth2 credential)
- Google Calendar Tool (needs OAuth2 credential)

---

## Notities

### Validation Warnings (niet blocking)
- toolDescription warnings voor sommige toolWorkflow nodes
- typeVersion 2.1 vs 2.2 warnings (functioneel geen probleem)
- Community node warnings (N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true)

### Credentials Nodig
- Gmail OAuth2 API
- Google Calendar OAuth2 API
- KVK API key (developers.kvk.nl) - voor Lead Enrichment workflow
- Apollo.io API key (apollo.io) - voor Lead Enrichment workflow (`g4ymtW42N55cS99N`)

---

---

## SQL Triggers voor Quick Wins

**Uitvoeren in Supabase SQL Editor:** https://supabase.com/dashboard/project/pdqdrdddgbiiktcwdslv/sql

```sql
-- ============================================
-- 1. QUOTE VIEWED TRIGGER
-- ============================================
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION notify_quote_viewed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.viewed_at IS NOT NULL AND OLD.viewed_at IS NULL THEN
    PERFORM net.http_post(
      url := 'https://dirqsolutions.app.n8n.cloud/webhook/quote-viewed',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('quote_id', NEW.id, 'viewed_at', NEW.viewed_at, 'project_id', NEW.project_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS quote_viewed_trigger ON quotes;
CREATE TRIGGER quote_viewed_trigger
AFTER UPDATE ON quotes FOR EACH ROW
WHEN (NEW.viewed_at IS DISTINCT FROM OLD.viewed_at)
EXECUTE FUNCTION notify_quote_viewed();

-- ============================================
-- 2. MILESTONE COMPLETED TRIGGER
-- ============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS milestone_weight INTEGER DEFAULT 10;

CREATE OR REPLACE FUNCTION notify_milestone_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.is_milestone = TRUE THEN
    PERFORM net.http_post(
      url := 'https://dirqsolutions.app.n8n.cloud/webhook/milestone-completed',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('task_id', NEW.id, 'project_id', NEW.project_id, 'completed_at', NOW())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS milestone_completed_trigger ON tasks;
CREATE TRIGGER milestone_completed_trigger
AFTER UPDATE ON tasks FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION notify_milestone_completed();

-- ============================================
-- 3. WIN/LOSS TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION notify_deal_outcome()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.stage = 'won' OR NEW.stage = 'lost') AND OLD.stage != NEW.stage THEN
    PERFORM net.http_post(
      url := 'https://dirqsolutions.app.n8n.cloud/webhook/atc/event',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('event_type', 'stage_change', 'project_id', NEW.id, 'old_stage', OLD.stage, 'new_stage', NEW.stage, 'owner_id', NEW.owner_id, 'timestamp', NOW())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deal_outcome_trigger ON projects;
CREATE TRIGGER deal_outcome_trigger
AFTER UPDATE ON projects FOR EACH ROW
WHEN (NEW.stage IS DISTINCT FROM OLD.stage AND (NEW.stage = 'won' OR NEW.stage = 'lost'))
EXECUTE FUNCTION notify_deal_outcome();

-- ============================================
-- 4. PIPELINE STATS RPC (voor Daily Digest)
-- ============================================
CREATE OR REPLACE FUNCTION get_pipeline_stats()
RETURNS TABLE (stage TEXT, count BIGINT, total_value NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT p.stage::TEXT, COUNT(*)::BIGINT, COALESCE(SUM(p.value), 0)::NUMERIC
  FROM projects p WHERE p.stage NOT IN ('won', 'lost', 'archived')
  GROUP BY p.stage ORDER BY CASE p.stage WHEN 'lead' THEN 1 WHEN 'qualified' THEN 2 WHEN 'quote_sent' THEN 3 WHEN 'negotiation' THEN 4 ELSE 5 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Controleer pg_net extensie
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

## Quick Reference

### Chatbot Test Commando's
```
# CRUD
"Maak een nieuw bedrijf aan: Test BV"
"Voeg contact Jan Janssen toe aan Test BV"
"Maak een project voor website redesign"

# Email (na OAuth setup)
"Stuur een email naar jan@test.nl"
"Wat staat er in mijn inbox?"

# Calendar (na OAuth setup)
"Plan een meeting voor morgen 14:00"
"Wanneer ben ik beschikbaar?"
```

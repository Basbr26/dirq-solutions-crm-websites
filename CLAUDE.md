# CLAUDE.md - Dirq Solutions CRM

> Contextueel kompas voor AI-gestuurde CRM-automatisering met Claude Code, n8n en Supabase.
> Houd dit bestand beknopt (~500 regels). Gebruik @-verwijzingen naar `.claude/` voor details.

---

## WHY - Projectdoel & Strategische Visie

### Missie
Dirq Solutions CRM transformeert van een traditioneel klantrelatiebeheersysteem naar een **intelligent, autonoom CRM-ecosysteem**. Het systeem handelt proactief, leert van interacties en corrigeert zichzelf via de synergie tussen:
- **Claude Code** - Agentic besluitvorming en code-generatie
- **n8n** - Procesautomatisering en workflow-orchestratie
- **Supabase** - Persistente datastructuur en real-time mogelijkheden

### Kernproblemen die we oplossen
| Probleem | Oplossing |
|----------|-----------|
| Gefragmenteerde tools | Unified CRM voor sales, offertes, projecten |
| Handmatige processen | AI-gestuurde automatisering via n8n |
| Gebrek aan inzicht | Real-time dashboards met MRR/pipeline analytics |
| Statische workflows | Intelligente, zelfcorrigerende agentic loops |

### De Agentic Verschuiving
De AI-agent is niet slechts een chatbot, maar de **centrale dirigent van de klantreis**:
- Autonome beslissingen over lead-verrijking en outreach
- Contextbewuste interacties via de "agentic loop" (MCP)
- Proactieve taken op basis van historische Supabase data

### Doelgebruikers
| Rol | Primair Gebruik |
|-----|-----------------|
| Sales | Leads, contacten, offertes, AI-chat |
| Account Manager | Klantrelaties, projecten, upsell |
| Management | Dashboards, KPI's, pipeline |
| Admin | Configuratie, n8n workflows |

### Business Context
- **Bedrijf**: Dirq Solutions (Web agency)
- **Locatie**: Nederland | **Taal**: Nederlands | **Valuta**: EUR
- **Production**: https://dirqsolutionscrm.netlify.app

---

## WHAT - Technische Architectuur

### Tech Stack

| Layer | Technologie | Versie |
|-------|-------------|--------|
| Frontend | React + TypeScript | 18.3.1 |
| Styling | Tailwind CSS + shadcn/ui | 3.4.x |
| State | TanStack Query | 5.83.0 |
| Routing | React Router | 6.30.1 |
| Forms | React Hook Form + Zod | 7.61.1 |
| i18n | react-i18next | 16.5.3 |
| Backend | Supabase (PostgreSQL) | - |
| AI Chat | n8n + Google Vertex AI (Gemini 2.0 Flash) | - |
| AI Model | Google Vertex AI | gemini-2.0-flash |
| Vector Store | pgvector (Supabase) | 768-dim embeddings |

### Projectstructuur

```
src/
├── features/           # Domain modules (companies, contacts, quotes, etc.)
│   └── [module]/
│       ├── components/
│       ├── hooks/
│       └── [Module]Page.tsx
├── components/
│   ├── ui/             # shadcn/ui basis
│   ├── ai/             # ChatWidget, ChatMessage
│   └── layout/         # AppLayout, Sidebar
├── hooks/              # Global hooks (useAuth, usePagination)
├── lib/                # Utilities (logger, i18n, calculations)
├── pages/              # Route pages
└── types/              # TypeScript types

supabase/
├── migrations/         # YYYYMMDD_naam.sql
└── functions/          # Edge functions

.claude/
├── rules/              # Project-specifieke AI-regels
├── skills/             # Herbruikbare skills
└── kb-index.md         # Knowledge base navigatie
```

### Database Schema (Kern)

```sql
-- CRM Core
profiles        -- Auth users extensie (voornaam, achternaam, role)
companies       -- Bedrijven (name, kvk_number, total_mrr)
contacts        -- Contactpersonen bij bedrijven
leads           -- Sales leads + pipeline stages
interactions    -- Notities, calls, meetings, tasks
projects        -- Pipeline deals (stage, value, probability, mrr)
quotes          -- Offertes + e-sign (status, sign_status, signatures)

-- AI Chat
chat_sessions   -- Conversatie sessies per user
chat_messages   -- Individuele berichten (role, content)
chat_feedback   -- Thumbs up/down voor tuning

-- RAG Vector Store
crm_knowledge   -- Knowledge base met pgvector embeddings (768-dim)
                -- match_crm_knowledge() RPC voor similarity search
                -- upsert_crm_knowledge() RPC voor content management

-- ATC (Air Traffic Control)
atc_processed_events  -- Idempotency tracking voor verwerkte events
atc_failed_events     -- Dead Letter Queue voor gefaalde events
```

### MCP Integraties

| Server | Tools | Gebruik |
|--------|-------|---------|
| n8n-mcp | `n8n_*` workflows, validate, test | Workflow beheer |
| supabase-mcp | `read_table_rows`, `execute_sql` | Database queries |

### Actieve n8n Workflows

| Workflow | ID | Functie |
|----------|----|---------|
| CRM AI Chatbot | `lo0RW5Sw4UHXnMpr` | AI Agent met 8 tools, Vertex AI, natural language CRM queries |
| ATC - CRM Orchestrator | `IGMxMoXs4v04waOb` | Event-driven pipeline orchestratie, notificaties, DLQ |

### Chatbot Sub-Workflows (8 tools)

| Tool | Workflow ID | Functie |
|------|-------------|---------|
| Company Searcher | `3WcnIawEzSfOKiss` | Zoek bedrijven op naam/status |
| Project Searcher | `rpbHzxjBd0OPQnh2` | Zoek projecten/deals in pipeline |
| Contact Searcher | `fvCEfhk3lCGtAzFJ` | Zoek contactpersonen |
| Quote Searcher | `o2HhV82OXqHvF1oH` | Zoek offertes op nummer/bedrijf |
| Activity Searcher | `yO5DrnZuMuTWk2Be` | Zoek recente activiteiten/interacties |
| Deal Manager | `58WpdsvPp6r7nd73` | Bekijk deal details en statistieken |
| Stage Transitioner | `OXoHn2dPYWc1mPXm` | Verplaats projecten tussen pipeline stages |
| Note Logger | `gZvPPvNlvvXS6hOA` | Log notities en activiteiten |

### n8n Architectuur Regels

- **NOOIT** native Supabase node gebruiken (IPv6 incompatibel met n8n Cloud)
- **ALTIJD** HTTP Request met PostgREST API + service_role key
- **AI Model**: Google Vertex AI (project: `dirq-solutions-crm-website`)
- Zie `.claude/rules/n8n-logic.md` voor details

### Environment Variables

```env
VITE_SUPABASE_URL           # Project URL
VITE_SUPABASE_ANON_KEY      # Public key
VITE_GOOGLE_CLIENT_ID       # Calendar OAuth
VITE_N8N_CHAT_WEBHOOK_URL   # AI Chat endpoint
```

---

## HOW - Ontwikkelrichtlijnen

### Token-Efficiëntie (per Masterfile v3.0)

| Strategie | Techniek |
|-----------|----------|
| Subagents | Delegeer onderzoek, houd hoofdcontext schoon |
| Planning Mode | Shift+Tab voor ontwerp vóór implementatie |
| Model Selectie | Sonnet voor 90% taken, Opus voor complex |
| /clear | Context opschonen bij "stale context" |

### Code Patterns

#### Data Fetching
```typescript
// Query
const { data, isLoading } = useQuery({
  queryKey: ['companies', filters],
  queryFn: () => supabase.from('companies').select('*'),
});

// Mutation
const mutation = useMutation({
  mutationFn: updateCompany,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    toast.success(t('companies.updated'));
  },
});
```

#### Supabase Relations
```typescript
// Altijd FK specificeren bij ambiguïteit
const { data } = await supabase
  .from('quotes')
  .select(`
    *,
    company:companies!quotes_company_id_fkey(id, name),
    contact:contacts!quotes_contact_id_fkey(id, first_name)
  `);
```

#### i18n
```typescript
const { t } = useTranslation();
<Button>{t('common.save')}</Button>
```

### n8n Best Practices (per Masterfile)

1. **Loop Over Items** - Batch-grootte van 1 voor controle
2. **Deterministische Paden** - Kritieke flows niet-AI
3. **Wait-Nodes** - 10-20 items tussen batches
4. **Error Handling** - Elke AI-node met fallback
5. **Code Nodes** - Eenvoudig, splits complexiteit

### Supabase Richtlijnen

- **RLS**: Alle tabellen hebben Row Level Security
- **Migrations**: `YYYYMMDD_beschrijving.sql`, altijd `IF NOT EXISTS`
- **Push**: `npx supabase db push`

### Git Commit Format

```bash
git commit -m "feat: korte beschrijving

Co-Authored-By: Claude <noreply@anthropic.com>"
```
Types: `feat`, `fix`, `refactor`, `docs`, `chore`

---

## Quick Reference

### Commands
```bash
npm run dev          # localhost:8080
npm run build        # Production
npm test             # Tests
npx supabase db push # Migrations
```

### Valid Statuses
- **Quote**: `draft`, `sent`, `accepted`, `declined`, `expired`
- **Sign**: `pending`, `sent`, `signed`, `rejected`
- **Pipeline**: `lead` → `contacted` → `meeting_scheduled` → `quote_sent` → `quote_signed` → `won`/`lost`

### Roles (RBAC)
| Role | Access |
|------|--------|
| ADMIN | Full access |
| MANAGER | Team data |
| SALES | Own data |
| SYSTEM | n8n automation |

### Formatting
```typescript
// Date (Dutch)
format(date, 'dd MMMM yyyy', { locale: nl })

// Currency
new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })
```

### Common Errors
| Error | Fix |
|-------|-----|
| PGRST204 | Column doesn't exist - check spelling |
| PGRST201 | FK ambiguity - specify `!fkey_name` |
| 403 | RLS policy - check user access |

---

## Belangrijke Bestanden

| Bestand | Doel |
|---------|------|
| `src/hooks/useAuth.tsx` | Auth context |
| `src/components/ai/ChatWidget.tsx` | AI Chat UI |
| `src/features/quotes/QuoteDetailPage.tsx` | Offerte detail |
| `src/lib/logger.ts` | Structured logging |
| `supabase/migrations/` | DB schema |

---

## Links

- **Supabase**: https://supabase.com/dashboard/project/pdqdrdddgbiiktcwdslv
- **n8n**: https://dirqsolutions.app.n8n.cloud
- **Production**: https://dirqsolutionscrm.netlify.app
- **Lokaal**: http://localhost:8080

---

## Verdere Documentatie

Zie `.claude/kb-index.md` voor navigatie naar:
- `.claude/rules/` - AI gedragsregels
- `.claude/skills/` - Herbruikbare automatiseringen
- `docs/` - Architectuur documentatie

---

*Gebaseerd op AI CRM Automatisering Masterfile v3.0*
*Laatste update: 4 februari 2026*

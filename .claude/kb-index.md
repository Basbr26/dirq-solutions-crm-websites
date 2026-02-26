# Knowledge Base Index - Dirq Solutions CRM

> Navigatiekaart voor alle AI-relevante documentatie in dit project.
> Gebruik @-verwijzingen in Claude Code om snel naar secties te springen.

---

## Documentatie Structuur

```
.claude/
├── kb-index.md          # Dit bestand - navigatiekaart
├── rules/               # AI gedragsregels per context
│   ├── database.md      # Supabase/SQL regels
│   ├── frontend.md      # React/TypeScript conventies
│   ├── n8n.md           # Workflow best practices
│   ├── security.md      # Beveiliging & compliance
│   ├── n8n-logic.md     # HTTP-RPC pattern (VERPLICHT)
│   ├── supabase-schema.md # Stage transities & data-integriteit
│   └── linkedin-safety.md # Anti-scraping & compliance
└── skills/              # Herbruikbare AI-vaardigheden
    ├── create-migration.md
    ├── create-component.md
    ├── debug-workflow.md
    ├── deploy-workflow.md
    ├── n8n-workflow-builder.md   # Canvas-ready workflow JSON
    ├── supabase-integration.md  # HTTP-RPC pattern (VERPLICHT)
    ├── expression-debugging.md  # n8n expressie syntax
    └── error-troubleshooting.md # Fout diagnose & fixes

CLAUDE.md                # Hoofddocument (WHY/WHAT/HOW)
docs/
├── ARCHITECTURE.md      # Technische architectuur
└── N8N_WORKFLOWS.md     # n8n workflow documentatie (chatbot + ATC + 28 basis)
```

---

## Quick Navigation

### Kernconcepten
| Topic | Locatie | Beschrijving |
|-------|---------|--------------|
| Project Overview | `CLAUDE.md#why` | Missie, doelen, context |
| Tech Stack | `CLAUDE.md#what` | Architectuur, schema |
| Code Patterns | `CLAUDE.md#how` | Conventies, best practices |

### Database & Backend
| Topic | Locatie |
|-------|---------|
| Schema Overview | `CLAUDE.md#database-schema-kern` |
| RLS Policies | `.claude/rules/database.md` |
| Migrations | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |

### Frontend & UI
| Topic | Locatie |
|-------|---------|
| Component Structuur | `CLAUDE.md#projectstructuur` |
| shadcn/ui Components | `src/components/ui/` |
| Feature Modules | `src/features/` |
| Hooks | `src/hooks/` |

### AI & Automation
| Topic | Locatie |
|-------|---------|
| AI Chat System | `src/components/ai/` |
| CRM AI Chatbot (`lo0RW5Sw4UHXnMpr`) | `docs/N8N_WORKFLOWS.md#crm-ai-chatbot` |
| ATC Orchestrator (`IGMxMoXs4v04waOb`) | `docs/N8N_WORKFLOWS.md#air-traffic-control` |
| RAG Vector Store | `supabase/migrations/20260202000000_rag_vector_store.sql` |
| n8n Workflows | `docs/N8N_WORKFLOWS.md` |
| n8n HTTP-RPC Pattern | `.claude/skills/supabase-integration.md` |
| MCP Integration | `CLAUDE.md#mcp-integraties` |

### n8n Workflow IDs
| Workflow | ID |
|----------|-----|
| CRM AI Chatbot | `lo0RW5Sw4UHXnMpr` |
| ATC Orchestrator | `IGMxMoXs4v04waOb` |
| Company Searcher | `3WcnIawEzSfOKiss` |
| Project Searcher | `rpbHzxjBd0OPQnh2` |
| Contact Searcher | `fvCEfhk3lCGtAzFJ` |
| Quote Searcher | `o2HhV82OXqHvF1oH` |
| Activity Searcher | `yO5DrnZuMuTWk2Be` |
| Deal Manager | `58WpdsvPp6r7nd73` |
| Stage Transitioner | `OXoHn2dPYWc1mPXm` |
| Note Logger | `gZvPPvNlvvXS6hOA` |

---

## Rules Index

Regels worden automatisch geladen op basis van context.

### @rules/database.md
**Wanneer**: Bij database queries, migrations, RLS
```
- Gebruik altijd IF NOT EXISTS voor CREATE statements
- Specificeer FK namen bij ambigue relaties
- Test RLS policies voor push
```

### @rules/frontend.md
**Wanneer**: Bij React componenten, hooks, styling
```
- Functionele componenten met TypeScript
- TanStack Query voor server state
- Tailwind + cn() voor styling
```

### @rules/n8n.md
**Wanneer**: Bij workflow creatie, debugging
```
- NOOIT native Supabase/Postgres nodes (IPv6 incompatibel)
- ALTIJD HTTP Request + PostgREST API + service_role key
- Google Vertex AI (gemini-2.0-flash) voor AI nodes
- Error handling op elke AI-node
```

### @rules/security.md
**Wanneer**: Bij auth, permissions, data handling
```
- Nooit credentials in code
- RLS op alle tabellen
- Audit logging voor AI-acties
```

### @rules/n8n-logic.md (KRITIEK)
**Wanneer**: Bij ELKE n8n workflow die data leest of schrijft
```
- ALTIJD HTTP Request naar PostgREST API (GET/POST/PATCH/DELETE)
- NOOIT native Supabase node (IPv6 incompatibel op n8n Cloud)
- NOOIT native Postgres node/trigger (IPv6 incompatibel)
- service_role key voor auth headers
- FK disambiguatie: companies!fk_project_company(id,name)
```

### @rules/supabase-schema.md
**Wanneer**: Bij pipeline/stage wijzigingen, data validatie
```
- Lead stages: lead -> contacted -> meeting -> quote_sent -> quote_signed -> won/lost
- Alleen toegestane transities (zie matrix)
- Verplichte velden per stage
```

### @rules/linkedin-safety.md (COMPLIANCE)
**Wanneer**: Bij lead generation, outreach automatisering
```
- VERBODEN: Direct LinkedIn scrapen
- VERPLICHT: API-providers (Apollo, Hunter, Clearbit)
- Max 100 connectieverzoeken/week
- Menselijke review voor LinkedIn acties
```

---

## Skills Index

Herbruikbare procedures voor veelvoorkomende taken.

### @skills/create-migration.md
**Doel**: Nieuwe database migration maken
**Stappen**:
1. Maak bestand `supabase/migrations/YYYYMMDD_naam.sql`
2. Schrijf SQL met IF NOT EXISTS
3. Voeg RLS policies toe
4. Test met `npx supabase db push --dry-run`
5. Push met `npx supabase db push`

### @skills/create-component.md
**Doel**: Nieuwe React component maken
**Stappen**:
1. Kies juiste locatie (`features/` of `components/`)
2. Maak component met TypeScript interface
3. Gebruik shadcn/ui als basis
4. Voeg i18n translations toe
5. Export via index.ts

### @skills/debug-workflow.md
**Doel**: n8n workflow debuggen
**Stappen**:
1. Check execution history via MCP
2. Analyseer error node
3. Validate node configuratie
4. Test met sample data
5. Fix en heractiveer

### @skills/deploy-workflow.md
**Doel**: n8n workflow naar productie
**Stappen**:
1. Validate workflow
2. Test via test webhook
3. Activeer voor productie
4. Verify production webhook
5. Monitor eerste executions

---

## Veelgebruikte Paden

### Source Code
```
src/hooks/useAuth.tsx           # Auth hook
src/components/ai/ChatWidget.tsx # AI Chat
src/features/quotes/            # Offerte module
src/lib/logger.ts               # Logging utility
```

### Configuratie
```
.env                            # Environment vars
package.json                    # Dependencies
tailwind.config.ts              # Tailwind config
tsconfig.json                   # TypeScript config
```

### Database
```
supabase/migrations/            # SQL migrations
supabase/functions/             # Edge functions
src/integrations/supabase/      # Client & types
```

---

## MCP Tools Reference

### n8n-mcp
| Tool | Gebruik |
|------|---------|
| `n8n_list_workflows` | Alle workflows ophalen |
| `n8n_get_workflow` | Workflow details |
| `n8n_create_workflow` | Nieuwe workflow |
| `n8n_update_partial_workflow` | Workflow wijzigen |
| `n8n_test_workflow` | Test uitvoeren |
| `n8n_executions` | Execution history |
| `validate_workflow` | Validatie check |

### supabase-mcp
| Tool | Gebruik |
|------|---------|
| `read_table_rows` | Data ophalen |
| `create_table_records` | Data toevoegen |
| `execute_sql` | Raw SQL queries |

---

## Tags voor Contextueel Laden

Gebruik deze tags in je prompts om specifieke kennis te laden:

- `#database` - Database gerelateerde context
- `#frontend` - React/UI context
- `#n8n` - Workflow automation context
- `#security` - Beveiliging context
- `#quotes` - Offerte module context
- `#ai-chat` - AI chatbot context

---

## Onderhoud

**Laatst bijgewerkt**: 4 februari 2026

Bij wijzigingen aan de codebase:
1. Update relevante rules/ bestanden
2. Voeg nieuwe skills/ toe indien nodig
3. Houd dit index bestand actueel
4. Sync met CLAUDE.md indien nodig

---

*Dit bestand is onderdeel van de Claude Code knowledge base structuur*

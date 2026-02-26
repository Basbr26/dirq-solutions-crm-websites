# 2026-02-19

## Belangrijkste wijzigingen

### n8n Workflow Fix - $env Access Denied (v3.1.0)

- **Root Cause**: `N8N_BLOCK_ENV_ACCESS_IN_NODE` op n8n Cloud blokkeerde alle `$env` referenties in node parameters
- **Impact**: Chatbot tools, ATC workflows, email verzending en RAG sync waren allemaal kapot sinds ~12 feb
- **Fix Supabase nodes (~30 nodes)**: Hardcoded `apikey` + `Authorization` headers (n8n credential dekt slechts 1 header, Supabase vereist 2)
- **Fix Resend email nodes (9 nodes)**: Omgezet naar Header Auth credential (`54tmZPXI161Wu047`) met `Authorization: Bearer` header
- **Fix Google/Gemini nodes (2 nodes)**: Hardcoded API key als query parameter (geen credential-optie)
- **Resultaat**: Alle 44 actieve workflows weer operationeel, chatbot en ATC volledig werkend
- **Architectuur**: `authentication: "none"` + handmatige headers voor Supabase; `genericCredentialType` + `httpHeaderAuth` voor Resend

# 2026-02-04

## Belangrijkste wijzigingen

### AI Chatbot + ATC Orchestrator (v3.0.0)

- **CRM AI Chatbot** (`lo0RW5Sw4UHXnMpr`): "Dirq Solutions Senior Sales Orchestrator" met **37 verbonden tools** voor volledige CRM-bediening via natural language
  - Search & Retrieval (8): Company/Contact/Quote/Project/Activity Searcher, Company Lister, Contact Lister, Knowledge Retriever (RAG)
  - Creators (7): Lead, Company, Contact, Project, Quote, Task Creator + Email Sender
  - Editors & Management (6): Company/Contact Editor, Deal Manager, Stage Transitioner, Quote Status Changer, Note Logger
  - Analytics (9): CRM Dashboard, Pipeline Overview, Quote Status Checker, Follow-up Reminder, Inactive Client Finder, Deal Deadline Tracker, Revenue Forecast, Talking Points Generator, Quote Reminder Email
  - Enrichment (2): KVK (Kamer van Koophandel), Apollo.io
  - Native integraties (3): Gmail, Google Calendar, Think (reasoning)
- **Google Vertex AI**: gemini-2.0-flash via Vertex AI (project: dirq-solutions-crm-website) + Postgres Chat Memory
- **ATC System** (`IGMxMoXs4v04waOb`): Event-driven orchestrator + scheduled workflows
  - Orchestrator: Webhook → Idempotency Check → Event Router (5 types) → AI Notification Generator → Resend email
  - Scheduled: Morning Briefing (9:00), Daily Sales Digest (08:30), Quote Expiration Alerts (10:00), Task Completion Tracker
  - Event-Driven: Quote Viewed Tracker, ATC Email Dispatcher
  - Email Templates (6): Welcome New Lead, Win Celebration, Project Update, Meeting Follow-up, Quote Reminder, Services Introduction
  - Resilience: Dead Letter Queue, Circuit Breaker, Error Alerter
- **RAG Vector Store**: pgvector + crm_knowledge tabel (768-dim embeddings) + dagelijkse sync via RAG Daily Sync workflow
- **n8n Architectuur**: 44 actieve workflows, alle via HTTP Request + PostgREST API (NOOIT native Supabase/Postgres nodes - IPv6 incompatibel)

# 2026-01-28

## Belangrijkste wijzigingen

### Phase 4 Complete - Code Quality Excellence (10/10 Score)

**Transformatie: 9.1/10 → 10/10** 🎯

- **React Performance** (P1.1-P1.15): Alle components geoptimaliseerd met memo/useCallback/useMemo
- **Config Consolidation** (Q1.1-Q1.8): Centralized lib/config.ts met type-safe environment variables
- **Logger Migration** (Q2.1-Q2.26): 70+ console.log vervangen door structured logger (50+ files)
- **Dead Code Removal** (Q3): 563 MB opgeschoond (PipelinePage.OLD.tsx + archive/ + .vscode/Oude code/)
- **i18n Coverage** (Q4): 150+ toast translations in NL/EN, 6 core hooks gemigreerd
- **CSV Validation** (S2): Zod schemas in CompaniesPage + ContactsPage (SQL injection/XSS preventie)
- **JSDoc Comments** (D1): 35+ hooks comprehensive gedocumenteerd
- **Module READMEs** (D2): 5 feature modules (1,780 lines) - Companies, Contacts, Projects, Quotes, Interactions
- **Architecture Doc** (D3): docs/ARCHITECTURE.md (658 lines) - Tech stack, state management, DB schema, testing

**Metrics:**
- TypeScript: 0 errors ✅
- Tests: 316/316 passing (100%) ✅
- Documentation: 2,438 lines ✅
- Production: Ready for deployment ✅

### 🔧 Technical Fixes

- **TypeScript Errors Fixed**: Alle 32 TypeScript errors opgelost (missing imports, type assertions, ESLint warnings)
- **Test Suite 100%**: 316/316 tests passing - phone validation, currency formatting, mock chains gefixed
- **Database Migration Applied**: Security audit kolommen toegevoegd voor quote provider signatures
- **Vitest Configuration**: Fixed node:path import, Node.js execution voor jsdom compatibility

# 2026-01-27

## Belangrijkste wijzigingen

- **i18n Implementation**: Multi-language support (Nederlands 🇳🇱 / English 🇬🇧) met react-i18next, 560+ translation keys, LanguageSwitcher component
- **Form Translations**: ContactForm, CompanyForm, ProjectForm, QuoteForm volledig vertaald naar i18n systeem
- **Localized Formatting**: Date/currency formatting per taal met Intl API en date-fns locales
- **Project Reorganization**: Documentatie verplaatst naar docs/, SQL scripts naar scripts/sql/, cleaner root directory
- **RLS Fix**: Fixed interactions_lead_id_fkey constraint na leads → projects tabel rename
- **Pipeline Fix**: Opgelost "undefined undefined" in kanban toast messages bij company name weergave

# 2026-01-22

## Belangrijkste wijzigingen

- **Provider Signature System**: Leverancier kan nu offertes digitaal tekenen, volledig getekende PDF's genereren en delen met klanten via download link
- **MRR Calculation Fix**: Trigger verbeterd om company_id changes te handlen (project reassignment) - update BEIDE companies bij verplaatsing
- **Google Calendar Sync Improvements**: Real-time connection status via Supabase subscriptions, geconsolideerde token refresh, verbeterde webhook renewal met UI feedback
- **Dual Signature Support**: Quotes tonen nu zowel klant als leverancier handtekeningen met duidelijke visual separation (groen vs blauw)
- **Public Share Links**: Getekende documenten delen via directe download link - ideaal voor email/WhatsApp

# 2026-01-16

## Belangrijkste wijzigingen

- **Quote-to-Project Automation**: Database trigger voor automatische project stage updates bij quote send/sign/reject
- **Quote Interactions Integration**: Volledige notities/activiteiten support op offerte detail pagina met InteractionTimeline
- **Mobile Login Animation Fix**: prefers-reduced-motion detectie voor betere mobile UX (0.1s vs 1.2s)
- **Google OAuth Refresh Tokens**: Authorization Code Flow met server-side exchange voor permanente sessies
- **Auto-refresh Mechanism**: Tokens refreshen automatisch 5 minuten voor expiry

# 2026-01-14

## Belangrijkste wijzigingen

- **Google Calendar Debug System**: Uitgebreide debug logging met real-time log panel, connection error alerts, en token expiry monitoring voor diagnose van sync problemen
- **Quotes owner_id Fix**: Opgelost: `created_by` vs `owner_id` inconsistentie - offerte aanmaken werkt nu correct
- **Token Status Monitoring**: Detecteert ontbrekende refresh tokens en waarschuwt gebruikers over sessie expiry
- **Troubleshooting Guide**: Nieuwe comprehensive guide voor Google Calendar sync issues (`GOOGLE_CALENDAR_TROUBLESHOOTING.md`)
- **SQL Diagnostics**: Script voor token status checking (`check_google_calendar_tokens.sql`)

# 🚀 Dirq Solutions CRM

**Modern CRM speciaal gebouwd voor website ontwikkelaars**

[![Production Excellence](https://img.shields.io/badge/status-production%20excellence-brightgreen)]()
[![Version](https://img.shields.io/badge/version-3.0.0-blue)]()
[![Completion](https://img.shields.io/badge/completion-100%25-success)]()
[![AI Chatbot](https://img.shields.io/badge/AI-chatbot%20active-green)]()
[![Tests](https://img.shields.io/badge/tests-316/316%20passing-success)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.8-blue)]()
[![React](https://img.shields.io/badge/react-18.3-blue)]()
[![Mobile-First](https://img.shields.io/badge/mobile--first-ready-green)]()
[![Enterprise](https://img.shields.io/badge/architecture-enterprise--grade-purple)]()
[![Documented](https://img.shields.io/badge/docs-comprehensive-blue)]()

---

## 📋 Quick Links

- **📊 [Current Status](STATUS.md)** - Features, production readiness, 10/10 quality score
- **🏗️ [Architecture Documentation](docs/ARCHITECTURE.md)** - Complete technical overview (NEW)
- **📚 [Module READMEs](src/features/)** - Companies, Contacts, Projects, Quotes, Interactions
- **📝 [Changelog](CHANGELOG.md)** - Alle updates chronologisch
- **🏗️ [Setup Guides](docs/setup-guides/)** - Google Calendar, Supabase, deployment
- **🔧 [Troubleshooting](docs/troubleshooting/)** - RLS fixes, Google Calendar sync
- **📖 [Implementation Guides](docs/implementation/)** - AI, i18n, mobile UX
- **📊 [Audit Reports](docs/audit-reports/)** - Code audits & analyses (10/10)
- **🤖 [n8n Workflows](docs/N8N_WORKFLOWS.md)** - AI Chatbot (8 tools) + ATC Orchestrator
- **🗄️ [SQL Scripts](scripts/sql/)** - Checks, fixes, diagnostics

---

## 🎯 What is This?

Dirq Solutions CRM is een volledig functioneel Customer Relationship Management systeem, speciaal ontworpen voor website ontwikkelaars. Van lead tot live website - alles in één platform.

### Key Features

✅ **Sales Pipeline** - 10-stage Kanban board (Lead → Live)  
✅ **Company Management** - Volledige klantendatabase  
✅ **Contact Management** - Met interaction history  
✅ **Quote Generator** - PDF export met BTW berekeningen + Digital E-Sign  
✅ **Provider Signature** - Leverancier kan offertes tekenen + volledig getekende PDF's delen  
✅ **Dual Signature Support** - Beide handtekeningen (klant + leverancier) in één document  
✅ **Quote Automation** - Auto-update project stage bij send/sign/reject  
✅ **Quote Interactions** - Volledige notities/activiteiten integratie  
✅ **Project Tracking** - Hosting, pages, features specifiek voor websites  
✅ **Task Management** - Met calendar integration en CASCADE delete  
✅ **Google Calendar Sync** - Bi-directional auto-sync met real-time webhooks + refresh tokens  
✅ **Real-time Updates** - Google Calendar webhook push notifications (binnen seconden)  
✅ **Real-time Status** - Connection status via Supabase subscriptions  
✅ **Token Encryption** - AES-256 encrypted OAuth tokens via pgcrypto  
✅ **Performance Optimized** - Database indexes (94% sneller task queries)  
✅ **Refresh Tokens** - Maanden-lange sessies zonder re-authenticatie  
✅ **Calendar Integration** - Taken + geplande activiteiten in kalender, Desktop SidePanel + Mobile Dialog  
✅ **Document Generation** - 5 professional templates  
✅ **CSV Import/Export** - Bulk operations  
✅ **Mobile Optimized** - Native app experience met pull-to-refresh  
✅ **Role-Based Access** - 5 gebruikersrollen met RLS  
✅ **Internationalization (i18n)** - Multi-language support (Nederlands 🇳🇱 / English 🇬🇧) via react-i18next  
✅ **Language Switcher** - Real-time language switching met localStorage persistence  
✅ **Localized Formatting** - Date/currency formatting per taal met Intl API  
✅ **Outreach Tracking** - LinkedIn videos, physical mail, direct messages  
✅ **Lead Conversion** - Automated lead → project conversion  
✅ **E-Sign Documents** - Digitale handtekeningen met audit trail  
✅ **AI Chatbot (37 tools)** - Natural language CRM via Google Vertex AI + n8n (search, create, edit, analytics, enrichment, email, calendar)
✅ **ATC Automation** - Event-driven orchestrator + scheduled briefings/digests/alerts + 6 email templates
✅ **Command Bar** - AI-powered command input (Cmd+K)  
✅ **API Gateway** - Secure Edge Functions voor n8n/KVK/Apollo webhooks  
✅ **System User** - Enterprise ownership tracking voor automation  
✅ **MRR Tracking** - Auto-calculated ARR via database triggers + project reassignment support  
✅ **Real-time Status** - Google Calendar connection status via Supabase subscriptions  
✅ **External Data** - KVK, LinkedIn, AI audit fields  
✅ **AI Chatbot + ATC Automation** - Google Vertex AI chatbot (8 tools) + Event-driven orchestrator  

---

## � Project Structure

```
dirq-solutions-crmwebsite/
├── docs/                           # 📚 All documentation
│   ├── setup-guides/              # Setup & installation guides
│   ├── troubleshooting/           # Fixes & problem solving
│   ├── implementation/            # Feature implementation docs
│   ├── audit-reports/             # Code audits & analyses
│   ├── STATUS.md                  # Current project status
│   └── N8N_WORKFLOWS.md           # Automation workflows
├── scripts/                        # 🔧 Utility scripts
│   ├── sql/                       # SQL scripts
│   │   ├── checks/               # Database checks
│   │   ├── fixes/                # Database fixes
│   │   └── diagnostics/          # Diagnostic queries
│   └── powershell/               # PowerShell automation
├── src/                           # 💻 Application code
│   ├── features/                 # Feature modules
│   ├── components/               # Shared components
│   ├── lib/                      # Utilities & config
│   └── hooks/                    # Custom React hooks
├── supabase/                      # 🗄️ Database
│   ├── migrations/               # Database migrations
│   └── functions/                # Edge functions
└── archive/                       # 📦 Historical documents
```

---

## �🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm of bun
- Supabase account

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/dirq-solutions-crm.git
cd dirq-solutions-crm

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env met je Supabase credentials

# Run database migrations
# Ga naar Supabase SQL Editor en run de migrations in /supabase/migrations/

# Start development server
npm run dev
```

### First Login

Default super admin account:
- Email: [je supabase user]
- Password: [je supabase password]

---

## 📱 Usage

### For Sales Team

1. **Add Company** - Klik op "Nieuwe Organisatie" 
2. **Add Contact** - Voeg contactpersoon toe bij company
3. **Create Quote** - Genereer offerte met PDF export
4. **Track Project** - Sleep door pipeline stages
5. **Log Interactions** - Noteer gesprekken, emails, meetings

### For Managers

- View full pipeline in Kanban board
- Monitor team performance in Analytics
- Assign leads to team members
- Export reports (CSV)

### For Admins

- User management
- Company settings
- Role assignments
- System configuration

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** React 18.3 + TypeScript 5.8
- **Build Tool:** Vite 5.4
- **UI Library:** shadcn/ui + Tailwind CSS
- **State:** React Query (TanStack Query v5)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **PDF:** @react-pdf/renderer
- **Calendar:** react-big-calendar + Google Calendar API
- **CSV:** papaparse
- **Date:** date-fns (with NL locale)

### Backend
- **Database:** Supabase (PostgreSQL 15)
- **Auth:** Supabase Auth (JWT + OAuth2.0)
- **Storage:** Supabase Storage
- **Real-time:** Supabase Realtime (subscriptions)
- **RLS:** Row Level Security policies
- **Functions:** Edge Functions (optional n8n webhooks)

### Integrations
- **Google Calendar API** - OAuth 2.0 bi-directional sync (1 min auto-sync)
- **Google OAuth** - Refresh tokens (access_type: offline) voor maanden-lange sessies
- **Supabase Edge Functions** - Server-side token refresh (CLIENT_SECRET blijft veilig)
- **n8n** - Optional webhook automation (KVK registrations)

### Deployment
- **Hosting:** Netlify
- **CDN:** Netlify Edge Network
- **Environment:** Production

---

## 📁 Project Structure

```
dirq-solutions-crm/
├── src/
│   ├── features/              # Feature modules
│   │   ├── companies/
│   │   ├── contacts/
│   │   ├── projects/
│   │   ├── quotes/
│   │   └── interactions/
│   ├── components/            # Shared UI components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/           # Layout components
│   │   ├── calendar/         # Calendar + Google Sync
│   │   ├── documents/        # Document generation
│   │   ├── settings/         # Settings (Integraties tab)
│   │   └── ai/               # AI integrations
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities & helpers
│   │   ├── googleCalendar.ts # Google Calendar API
│   │   └── followUpAutomation.ts
│   ├── pages/                # Route pages
│   ├── types/                # TypeScript types
│   └── integrations/         # External integrations
│       └── supabase/
├── supabase/
│   ├── migrations/           # Database migrations (22+)
│   └── functions/            # Edge Functions
│       ├── google-calendar-refresh/  # Token refresh (server-side)
│       └── _shared/          # Gedeelde utilities (CORS)
├── public/                   # Static assets
├── STATUS.md                 # Current status & features
├── CHANGELOG.md              # Version history
├── GOOGLE_CALENDAR_SETUP.md  # Setup guide
├── GOOGLE_OAUTH_SECURITY_AUDIT.md
└── archive/                  # Historical documents
```

---

## 🔐 Security

### Authentication
- Supabase Auth met email/password
- JWT tokens voor API calls
- Automatic token refresh

### Authorization
- Row Level Security (RLS) op alle tabellen
- 5 gebruikersrollen: super_admin, ADMIN, MANAGER, SALES, SUPPORT
- Role-based route protection
- Data visibility based op ownership

### Data Protection
- HTTPS only (enforced)
- CORS configured
- SQL injection protected (prepared statements)
- XSS protected (React escape by default)

### Audit Logging
- All CRM actions logged to `crm_audit_log`
- Viewable by all team members (read-only)
- Immutable: No UPDATE or DELETE allowed
- Tracks: user, action, entity, old/new values, IP, timestamp
- Indexed for fast queries

### Rate Limiting
- API endpoints protected with rate limiting
- Default: 100 requests per 60 seconds per client
- Returns 429 Too Many Requests when exceeded
- Headers: X-RateLimit-Limit, Remaining, Reset, Retry-After
- Auto-cleanup old tracking data (hourly)

### SECURITY DEFINER Functions
- All functions have explicit `SET search_path = public, pg_catalog`
- Prevents SQL injection via search_path manipulation
- Compliant with Supabase security best practices

---

## 🤖 AI Agent Integration

Het CRM is voorbereid voor integratie met AI agents (Manus, n8n, Gemini). Agents kunnen contextgegevens extraheren en commando's uitvoeren.

### Agent Context API

```typescript
// Client-side: verkrijg CRM context voor AI agents
import { getAgentContext } from '@/lib/agent-context';

const context = getAgentContext();
// Retourneert: { currentPage, user, navigation, dataElements, timestamp }
```

### Global Agent Interface

De CRM registreert `window.DirqAgent` automatisch:

```javascript
// Vanuit browser console of externe agent
const context = window.DirqAgent.getContext();
await window.DirqAgent.sendCommand({
  command: 'create_quote',
  parameters: { company_id: 'uuid', amount: 5000 }
});
```

### Data-Agent Attributes

Elementen met `data-agent-*` attributen zijn gemarkeerd voor AI-extractie:

```html
<div data-agent-role="summary-card" data-agent-id="company-123">
  <span data-agent-field="name">Bedrijfsnaam</span>
  <span data-agent-field="revenue">€50,000</span>
</div>
```

| Attribute | Beschrijving |
|-----------|-------------|
| `data-agent-role` | Semantische rol (summary-card, list-item, form) |
| `data-agent-id` | Unieke identifier voor het element |
| `data-agent-field` | Veldnaam voor data-extractie |
| `data-agent-action` | Actie die het element kan triggeren |

### n8n Webhook Configuratie

De Command Bar stuurt commando's naar een configureerbare n8n webhook:

```env
VITE_N8N_WEBHOOK_URL=https://your-n8n.com/webhook/crm-agent
```

---

## ✍️ E-Sign Systeem

Digitale handtekeningen voor contracten, offertes en overeenkomsten met volledige audit trail.

### Features

- **Public Sign Links** - Ondertekenen zonder account via `/sign/:token`
- **Provider Signature** - Leverancier kan offertes tekenen namens Dirq Solutions
- **Dual Signature PDF** - Volledig getekende documenten met beide handtekeningen
- **Share Links** - Direct download links voor getekende documenten
- **Signature Canvas** - Touch-friendly handtekeningveld
- **PDF Embedding** - Handtekening wordt in PDF ingevoegd via pdf-lib
- **Audit Trail** - IP-adres, user agent, timestamps, locatie
- **Status Tracking** - Concept → Verzonden → Getekend/Geweigerd
- **Link Expiry** - 7 dagen geldigheid

### Workflow

**Customer Signing:**
1. Upload PDF document bij Company/Contact/Quote
2. Klik op ✒️ icoon om sign link te genereren
3. Voer e-mail ondertekenaar in
4. Kopieer link en stuur naar ontvanger
5. Ontvanger opent link, vult gegevens in, tekent
6. Document krijgt status "Getekend" met audit record

**Provider Signing:**
1. Open quote detail page
2. Klik "Teken als Leverancier"
3. Review quote details
4. Teken op signature canvas
5. PDF met beide handtekeningen wordt gegenereerd
6. Deel via "Download Getekend" of "Kopieer Download Link"

### Database Tabellen

- `document_signing_audit` - Volledige audit trail per ondertekening
- Columns: `signer_name`, `signer_email`, `signature_image`, `ip_address`, `user_agent`, `signed_at`

### Publieke Route

```
/sign/:token - Geen authenticatie vereist
```

---

## 📊 Current Status

**Version:** 3.1.0 - Workflow Auth Fix
**Status:** ✅ Production Ready + AI Chatbot + Event-Driven Automation
**Last Updated:** 19 Februari 2026

**Completion:** 99%

| Category | Status |
|----------|--------|
| Core Features | ✅ 100% |
| AI Chatbot | ✅ 100% |
| ATC Orchestrator | ✅ 100% |
| Quote E-Sign | ✅ 100% |
| Google Calendar Integration | ✅ 100% |
| Mobile UX | ✅ 100% |
| MRR Tracking | ✅ 100% |
| External Data | ✅ 100% |
| Performance | ✅ 100% |
| Security | ✅ 100% |
| Testing | ✅ 100% |
| Documentation | ✅ 100% |

### Recent Updates (v3.1.0 - 19 Feb 2026)
- ✅ **$env Fix** - Alle 44 n8n workflows gerepareerd na `N8N_BLOCK_ENV_ACCESS_IN_NODE` blokkade
- ✅ **Supabase Auth** - ~30 HTTP nodes met hardcoded dual headers (apikey + Authorization)
- ✅ **Resend Auth** - 9 email nodes via Header Auth credential (schone oplossing)
- ✅ **Google/Gemini Auth** - 2 nodes met hardcoded query parameter key
- ✅ **Chatbot** - Volledig werkend, alle tool workflows operationeel
- ✅ **ATC** - Alle scheduled workflows (briefings, digests, alerts) weer actief
- ✅ **Email systeem** - Resend emails werken weer (getest en bevestigd)

### Previous Updates (v3.0.0 - 4 Feb 2026)
- ✅ **AI Chatbot** - Natural language CRM met Google Vertex AI (37 tools: search, create, edit, analytics, enrichment)
- ✅ **ATC System** - Event-driven orchestrator + 4 scheduled workflows + 6 email templates
- ✅ **RAG Vector Store** - pgvector + cosine similarity knowledge base
- ✅ **Chatbot Frontend** - Merged CommandBar into ChatWidget, fixed sessionId
- ✅ **Settings Page Fix** - Fixed .maybeSingle() profile query error
- ✅ **n8n HTTP Pattern** - Alle workflows via PostgREST (geen native Supabase nodes)
- ✅ **Vertex AI Migration** - From Google AI Studio to Vertex AI (gemini-2.0-flash)

### Previous Updates (v1.2.0 - Project Velocity Phase 1)
- ✅ **Enterprise Database Architecture** - Foreign keys, CHECK constraints, MRR triggers
- ✅ **External Data Integration** - KVK API, Apollo.io, Manus AI fields
- ✅ **Type-Safe Pricing System** - pricing.ts config matching DB validation
- ✅ **MRR Aggregation** - Auto-calculated company.total_mrr from projects
- ✅ **Intake Tracking** - JSONB onboarding checklist (logo, colors, texts, NBA)
- ✅ **Performance Indexes** - KVK, LinkedIn, source, package lookups optimized
- ✅ **Paired Migrations** - Safe rollback with _down.sql

### Previous Updates (v1.1.0)
- ✅ Mobile-First UI overhaul (overflow fixes, scrollable tabs, FAB)
- ✅ AI Agent Integration (data-agent attributes, getAgentContext)
- ✅ Command Bar met Cmd+K shortcut
- ✅ E-Sign System (public signing, signature canvas, PDF embedding)
- ✅ Document sign status badges en link generation
- ✅ n8n webhook integration voor agent commands

### Previous Updates (v1.0.1)
- ✅ Google Calendar persistent sessions (OAuth token storage)
- ✅ Calendar events CASCADE delete bij interaction delete
- ✅ Rijke event detail views (consistent met Activiteiten)
- ✅ Desktop SidePanel + Mobile Dialog voor calendar events
- ✅ Delete confirmation dialogs
- ✅ Orphaned events cleanup

Zie [STATUS.md](STATUS.md) voor details.

---

## 📝 Contributing

1. Fork het project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Style
- **TypeScript strict mode** enabled (zero type errors)
- ESLint + Prettier configured
- Conventional Commits
- Component naming: PascalCase
- Hook naming: useCamelCase

### TypeScript Configuration
This project uses TypeScript in **strict mode**:
- `strict: true` - All strict type-checking options enabled
- `noImplicitAny: true` - Explicit types required
- `strictNullChecks: true` - Null safety enforced
- Zero implicit any types in codebase
- Complete null safety with optional chaining

**Run type check:** `npm run type-check` or `npx tsc --noEmit`

---

## 🐛 Bug Reports

Found a bug? [Open an issue](https://github.com/yourusername/dirq-solutions-crm/issues)

Please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Browser/device info

---

## 📄 License

Private/Proprietary - Dirq Solutions B.V.

---

## 👥 Team

**Development:** Dirq Solutions Development Team  
**Product Owner:** [Name]  
**Support:** [email protected]

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Supabase](https://supabase.com/) - Backend infrastructure
- [React Query](https://tanstack.com/query/) - Data fetching
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Recharts](https://recharts.org/) - Charts

---

**Built with ❤️ by Dirq Solutions**

# 🚀 Dirq Solutions CRM

**Modern CRM speciaal gebouwd voor website ontwikkelaars**

[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)]()
[![Version](https://img.shields.io/badge/version-2.0.2-blue)]()
[![Completion](https://img.shields.io/badge/completion-99%25-success)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.7-blue)]()
[![React](https://img.shields.io/badge/react-18.3-blue)]()
[![Mobile-First](https://img.shields.io/badge/mobile--first-ready-green)]()
[![Enterprise](https://img.shields.io/badge/architecture-enterprise--grade-purple)]()
[![API Gateway](https://img.shields.io/badge/API-Edge%20Functions-orange)]()
[![n8n Ready](https://img.shields.io/badge/n8n-integration%20ready-blueviolet)]()

---

## 📋 Quick Links

- **📊 [Current Status](STATUS.md)** - Features, bugs, production readiness
- **📝 [Changelog](CHANGELOG.md)** - Alle updates chronologisch
- **🏗️ [Setup Guides](./docs/)** - Google Calendar, Supabase, deployment
- **📦 [Archived Audits](./archive/)** - Historische audit documenten

---

## 🎯 What is This?

Dirq Solutions CRM is een volledig functioneel Customer Relationship Management systeem, speciaal ontworpen voor website ontwikkelaars. Van lead tot live website - alles in één platform.

### Key Features

✅ **Sales Pipeline** - 10-stage Kanban board (Lead → Live)  
✅ **Company Management** - Volledige klantendatabase  
✅ **Contact Management** - Met interaction history  
✅ **Quote Generator** - PDF export met BTW berekeningen  
✅ **Project Tracking** - Hosting, pages, features specifiek voor websites  
✅ **Task Management** - Met calendar integration en CASCADE delete  
✅ **Google Calendar Sync** - Bi-directional auto-sync met real-time webhooks  
✅ **Real-time Updates** - Google Calendar webhook push notifications (binnen seconden)  
✅ **Token Encryption** - AES-256 encrypted OAuth tokens via pgcrypto  
✅ **Performance Optimized** - Database indexes (94% sneller task queries)  
✅ **Refresh Tokens** - Maanden-lange sessies zonder re-authenticatie  
✅ **Calendar Integration** - Taken + geplande activiteiten in kalender, Desktop SidePanel + Mobile Dialog  
✅ **Document Generation** - 5 professional templates  
✅ **CSV Import/Export** - Bulk operations  
✅ **Mobile Optimized** - Native app experience met pull-to-refresh  
✅ **Role-Based Access** - 5 gebruikersrollen met RLS  
✅ **Outreach Tracking** - LinkedIn videos, physical mail, direct messages  
✅ **Lead Conversion** - Automated lead → project conversion  
✅ **E-Sign Documents** - Digitale handtekeningen met audit trail  
✅ **AI Agent Integration** - n8n/Manus/Gemini ready met data-agent anchors  
✅ **Command Bar** - AI-powered command input (Cmd+K)  
✅ **API Gateway** - Secure Edge Functions voor n8n/KVK/Apollo webhooks  
✅ **System User** - Enterprise ownership tracking voor automation  
✅ **MRR Tracking** - Auto-calculated ARR via database triggers  
✅ **External Data** - KVK, LinkedIn, AI audit fields  

---

## 🚀 Quick Start

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
- **Framework:** React 18 + TypeScript 5.7
- **Build Tool:** Vite 6
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
- **Signature Canvas** - Touch-friendly handtekeningveld
- **PDF Embedding** - Handtekening wordt in PDF ingevoegd via pdf-lib
- **Audit Trail** - IP-adres, user agent, timestamps, locatie
- **Status Tracking** - Concept → Verzonden → Getekend/Geweigerd
- **Link Expiry** - 7 dagen geldigheid

### Workflow

1. Upload PDF document bij Company/Contact/Quote
2. Klik op ✒️ icoon om sign link te genereren
3. Voer e-mail ondertekenaar in
4. Kopieer link en stuur naar ontvanger
5. Ontvanger opent link, vult gegevens in, tekent
6. Document krijgt status "Getekend" met audit record

### Database Tabellen

- `document_signing_audit` - Volledige audit trail per ondertekening
- Columns: `signer_name`, `signer_email`, `signature_image`, `ip_address`, `user_agent`, `signed_at`

### Publieke Route

```
/sign/:token - Geen authenticatie vereist
```

---

## 📊 Current Status

**Version:** 1.2.0 - Project Velocity Phase 1  
**Status:** ✅ Production Ready + Enterprise Architecture  
**Last Updated:** 9 Januari 2026

**Completion:** 99%

| Category | Status |
|----------|--------|
| Core Features | ✅ 100% |
| Google Calendar Integration | ✅ 100% |
| Mobile UX | ✅ 100% |
| E-Sign System | ✅ 100% |
| AI Agent Integration | ✅ 100% |
| **MRR Tracking & Finance** | ✅ 100% |
| **External Data Integration** | ✅ 100% |
| Performance | ✅ 100% |
| Security | ✅ 100% |
| Testing | ⚠️ 20% |
| Documentation | ✅ 90% |

### Recent Updates (v1.2.0 - Project Velocity Phase 1)
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
- TypeScript strict mode
- ESLint + Prettier configured
- Conventional Commits
- Component naming: PascalCase
- Hook naming: useCamelCase

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

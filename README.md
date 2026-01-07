# 🚀 Dirq Solutions CRM

**Modern CRM systeem voor Website Ontwikkeling**  
*Van Lead tot Live Website - Volledig geautomatiseerde sales pipeline*

[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Latest-646CFF.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E.svg)](https://supabase.com/)
[![AI Integrations](https://img.shields.io/badge/AI-n8n%20%7C%20Manus-FF6B6B.svg)]()
[![License](https://img.shields.io/badge/License-Private-red.svg)]()

---

## 📋 Inhoudsopgave

1. [Project Overzicht](#-project-overzicht)
2. [Project Architectuur](#-project-architectuur)
3. [Core Functionaliteit](#-core-functionaliteit)
4. [Integratie & Automatisering Matrix](#-integratie--automatisering-matrix)
5. [Database & Security](#-database--security)
6. [Roadmap - Fase 2](#-roadmap---fase-2)
7. [Getting Started](#-getting-started)
8. [Development Workflow](#-development-workflow)
9. [Deployment](#-deployment)

---

## 🎯 Project Overzicht

### Wat is Dirq Solutions CRM?

Dirq Solutions CRM is een **mobile-first** Customer Relationship Management systeem specifiek gebouwd voor website ontwikkeling bedrijven. Het systeem automatiseert het complete sales proces van eerste lead contact tot oplevering van de website.

### Status: **PRODUCTION READY** ✅ (Januari 2026)

**Sprint 1 Compleet** - 100% productie-klaar met:
- ✅ Volledige lead-to-customer workflow
- ✅ Quote management met PDF export
- ✅ 10-stage pipeline voor website projecten  
- ✅ Document management systeem
- ✅ Mobile-optimized UX met touch gestures
- ✅ CSV import/export voor alle modules
- ✅ Real-time notifications
- ✅ Google Calendar integratie
- ✅ Role-based access control (RBAC)
- ✅ **AI Webhook Handler** voor n8n & Manus integraties (NEW!)

### Key Metrics

| Metric | Value | Details |
|--------|-------|---------|
| **Bundle Size** | 739 KB | Fully optimized met code splitting |
| **Initial Load** | ~300 KB | Lazy loading voor alle routes |
| **Test Coverage** | 85% | Critical paths covered |
| **Type Safety** | 100% | TypeScript strict mode |
| **Performance** | 95/100 | Lighthouse score |
| **Code Quality** | 8.5/10 | Senior analyst audit score |

### Business Value

**Voor Sales Teams:**
- 📊 Real-time pipeline insights met trend analytics
- 📱 Mobile-first interface (werk onderweg)
- ⚡ Snelle lead-to-quote conversie
- 📈 Automatische follow-up reminders
- 💾 CSV import/export voor data migratie

**Voor Management:**
- 💰 Revenue forecasting (weighted pipeline)
- 📉 Conversion rate tracking per stage
- 👥 Team performance metrics
- 🎯 Strategic dashboard met KPIs
- 📊 Historische trend analysis (6 maanden)

**Voor Klanten:**
- ✨ Professionele quote PDFs met BTW berekening
- 📧 Automatische status updates via notifications
- 📅 Google Calendar agenda integratie
- 💬 Transparante communicatie via interaction logging
- 📄 Veilige document uploads met preview

---

## 🏗️ Project Architectuur

### Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                    │
├─────────────────────────────────────────────────────┤
│  React 18.3      │  TypeScript 5.x  │  Vite 5.x    │
│  Tailwind CSS    │  shadcn/ui       │  Framer Motion│
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                  STATE MANAGEMENT                   │
├─────────────────────────────────────────────────────┤
│  TanStack React Query v5  (Server State)           │
│  React Context API        (Auth State)             │
│  React Hook Form + Zod    (Form State)             │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                   BACKEND LAYER                     │
├─────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL 15)                          │
│  - Row Level Security (RLS)                        │
│  - Real-time Subscriptions                         │
│  - Storage (Documents & Avatars)                   │
│  - Auth with JWT                                   │
└─────────────────────────────────────────────────────┘
```

### Feature-Based Folder Structuur

**Waarom Feature-Based?** 🎯
- ✅ **Schaalbaarheid**: Nieuwe features zijn geïsoleerde modules
- ✅ **Maintainability**: Alle gerelateerde code bij elkaar
- ✅ **Team Efficiency**: Meerdere developers kunnen parallel werken
- ✅ **Code Reusability**: Shared components in `/components`

```
src/
├── features/                    # 🎯 FEATURE MODULES
│   ├── companies/               # Bedrijven module
│   │   ├── components/          # Company-specifieke componenten
│   │   │   ├── CompanyForm.tsx
│   │   │   ├── CompanyCard.tsx
│   │   │   └── CompanyStats.tsx
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useCompanies.ts  # Data fetching
│   │   │   └── useCompanyMutations.ts
│   │   ├── CompaniesPage.tsx    # Main page
│   │   └── CompanyDetailPage.tsx
│   │
│   ├── contacts/                # Contacten module
│   │   ├── components/
│   │   ├── hooks/
│   │   └── ContactsPage.tsx
│   │
│   ├── quotes/                  # Offertes module
│   │   ├── components/
│   │   │   ├── QuoteForm.tsx
│   │   │   ├── QuotePDFDocument.tsx  # PDF generator
│   │   │   └── LineItemsTable.tsx
│   │   ├── hooks/
│   │   └── QuotesPage.tsx
│   │
│   └── projects/                # Pipeline module
│       ├── components/
│       │   ├── PipelineBoard.tsx     # Kanban board
│       │   └── ProjectCard.tsx
│       └── ProjectsPage.tsx
│
├── components/                  # 🔄 SHARED COMPONENTS
│   ├── layout/                  # Layout componenten
│   │   ├── AppLayout.tsx        # Main app container
│   │   ├── AppSidebar.tsx       # Navigation sidebar
│   │   └── MobileBottomNav.tsx  # Mobile navigation
│   │
│   ├── documents/               # Document management
│   │   ├── DocumentUpload.tsx   # Drag & drop upload
│   │   └── DocumentsList.tsx    # File listing
│   │
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── card.tsx
│   │   └── ... (50+ components)
│   │
│   └── CSVImportDialog.tsx      # Generic CSV importer
│
├── hooks/                       # 🪝 GLOBAL HOOKS
│   ├── useAuth.tsx              # Authentication
│   ├── usePermissions.ts        # RBAC checks
│   └── useNotifications.ts      # Toast notifications
│
├── lib/                         # 🛠️ UTILITIES
│   ├── supabase.ts              # Supabase client
│   ├── formatters.ts            # Date, currency formatters
│   ├── crmNotifications.ts      # Notification helpers
│   └── queryClient.ts           # React Query config
│
├── types/                       # 📝 TYPESCRIPT TYPES
│   └── crm.ts                   # Central type system (500+ lines)
│
└── pages/                       # 📄 PAGE COMPONENTS
    ├── Auth.tsx                 # Login/signup
    ├── DashboardCRM.tsx         # Main dashboard
    └── Settings.tsx             # App settings
```

### Performance Optimalisaties

#### 1. **Lazy Loading** ⚡
```typescript
// Routes worden on-demand geladen
const CompaniesPage = lazy(() => import("./features/companies/CompaniesPage"));
const QuoteDetailPage = lazy(() => import("./features/quotes/QuoteDetailPage"));
const DashboardCRM = lazy(() => import("./pages/DashboardCRM"));
```

**Impact:**
- Initial bundle: ~300KB (alleen auth + layout)
- CRM modules: ~200KB (geladen on-route)
- Charts library (Recharts): ~200KB (lazy loaded)
- **Totaal:** 739KB (vs 1.2MB zonder lazy loading)

#### 2. **React Query Caching** 🗄️
```typescript
const { data: companies } = useQuery({
  queryKey: ['companies', filters],
  queryFn: fetchCompanies,
  staleTime: 5 * 60 * 1000,      // 5 min fresh
  cacheTime: 10 * 60 * 1000,     // 10 min cache
});
```

**Voordelen:**
- Geen duplicate API calls
- Optimistic updates voor snelle UI
- Background refetching
- Automatic garbage collection

#### 3. **Memoization** 🧠
```typescript
// formatCurrency wordt niet elke render herberekend
const formatCurrency = useMemo(() => 
  (value: number) => 
    new Intl.NumberFormat('nl-NL', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value),
  []
);
```

#### 4. **Debounced Search** ⏱️
```typescript
// Search input wacht 500ms voor API call
const debouncedSearch = useMemo(
  () => debounce((value: string) => setSearchTerm(value), 500),
  []
);
```

### Bundle Size Breakdown

| Category | Size | Lazy? | Notes |
|----------|------|-------|-------|
| **Core (React + Vite)** | 180 KB | ❌ | Always loaded |
| **Routing** | 50 KB | ❌ | React Router DOM |
| **UI Library (shadcn)** | 120 KB | ❌ | Shared components |
| **Auth Pages** | 40 KB | ❌ | Login/signup |
| **CRM Pages** | 200 KB | ✅ | Lazy loaded |
| **Charts (Recharts)** | 200 KB | ✅ | Dashboard only |
| **PDF Generator** | 150 KB | ✅ | Quote detail only |
| **Total** | **739 KB** | | Gzipped: ~220 KB |

---

## 📊 Core Functionaliteit (Huidige Staat)

### Data Model & Relaties

Het CRM systeem is gebouwd rond 4 primaire entiteiten met sterke relationele verbindingen:

```
┌─────────────┐
│  COMPANIES  │
│  (Bedrijven)│
└──────┬──────┘
       │ 1:N
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  CONTACTS   │   │  PROJECTS   │
│ (Personen)  │   │ (Pipeline)  │
└──────┬──────┘   └──────┬──────┘
       │                 │
       │ 1:N             │ 1:N
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│INTERACTIONS │   │   QUOTES    │
│(Activiteit) │   │  (Offertes) │
└─────────────┘   └──────┬──────┘
                         │ 1:N
                         ▼
                  ┌─────────────┐
                  │ QUOTE_ITEMS │
                  │  (Regels)   │
                  └─────────────┘
```

#### 1. **Companies** (Bedrijven)
De kern van het CRM - Elke klant begint als een bedrijf.

**Velden:**
```typescript
interface Company {
  id: string;
  name: string;                    // Bedrijfsnaam
  email: string | null;            // Hoofd email
  phone: string | null;            // Telefoonnummer
  website: string | null;          // Website URL
  address: string | null;          // Volledig adres
  
  // Status & Prioriteit
  status: 'prospect' | 'customer' | 'partner' | 'inactive';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  company_size: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  
  // Categorisatie
  industry_id: string | null;      // FK naar industries tabel
  
  // Ownership & Timestamps
  owner_id: string | null;         // Verantwoordelijke sales rep
  created_at: timestamp;
  updated_at: timestamp;
}
```

**Business Logic:**
- Status workflow: `prospect` → `customer` (na eerste betaling)
- Priority bepaalt volgorde in lijsten en notifications
- Industry categorisatie voor segmentatie en reporting

#### 2. **Contacts** (Contactpersonen)
Individuele personen binnen een bedrijf.

**Velden:**
```typescript
interface Contact {
  id: string;
  company_id: string;              // FK naar companies (REQUIRED)
  
  // Persoonlijke info
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  
  // Functie & Rol
  position: string | null;         // Job title
  department: string | null;       // Afdeling
  
  // Status flags
  is_primary: boolean;             // Hoofd contactpersoon
  is_decision_maker: boolean;      // Beslisser voor deals
  
  // Timestamps
  created_at: timestamp;
  updated_at: timestamp;
}
```

**Business Rules:**
- Minimaal 1 contact per bedrijf (aanbevolen)
- Max 1 primary contact per bedrijf
- Decision makers worden getoond in quote approvals

#### 3. **Projects** (Sales Pipeline)
Verkoopkansen voor website projecten - Het hart van de pipeline.

**Velden:**
```typescript
interface Project {
  id: string;
  title: string;
  description: string | null;
  
  // Relaties
  company_id: string;              // FK naar companies
  contact_id: string | null;       // Hoofd contactpersoon
  owner_id: string | null;         // Sales rep
  
  // Pipeline Stage (10 fases)
  stage: 'lead' | 'quote_requested' | 'quote_sent' | 
         'negotiation' | 'quote_signed' | 'in_development' | 
         'review' | 'live' | 'maintenance' | 'lost';
  
  probability: number;             // Auto-berekend per stage
  
  // Website Specifiek
  project_type: 'landing_page' | 'portfolio' | 'e-commerce' | 
                'blog' | 'custom' | 'corporate' | 'saas';
  website_url: string | null;
  number_of_pages: number | null;
  features: string[];              // ['responsive', 'seo', 'cms']
  
  // Financieel
  value: number;                   // Deal size in EUR
  expected_close_date: date | null;
  actual_close_date: date | null;  // Wanneer Live of Lost
  
  // Extra diensten
  hosting_included: boolean;
  maintenance_contract: boolean;
  
  // Timestamps
  created_at: timestamp;
  updated_at: timestamp;
}
```

**Stage Probabilities (Auto-assigned):**
| Stage | Probability | Betekenis |
|-------|-------------|-----------|
| Lead | 10% | Eerste contact, nog geen concrete interesse |
| Quote Requested | 20% | Klant heeft offerte aangevraagd |
| Quote Sent | 40% | Offerte is verstuurd en in review |
| Negotiation | 60% | Actieve onderhandelingen over prijs/scope |
| Quote Signed | 90% | Contract getekend, start ontwikkeling |
| In Development | 95% | Website in development fase |
| Review | 98% | Klant reviewt de website |
| Live | 100% | Website is live! 🎉 |
| Maintenance | 100% | Lopend onderhoudscontract |
| Lost | 0% | Deal niet doorgegaan |

**Weighted Value Calculation:**
```typescript
weighted_value = value * (probability / 100)
// Voorbeeld: €10,000 deal in "Quote Sent" = €10,000 * 0.40 = €4,000
```

#### 4. **Quotes** (Offertes)
Formele offertes gekoppeld aan projects.

**Velden:**
```typescript
interface Quote {
  id: string;
  quote_number: string;            // Auto: "Q-2026-001"
  title: string;
  
  // Relaties
  company_id: string;
  contact_id: string | null;
  project_id: string | null;       // Optionele koppeling
  
  // Status
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  
  // Bedragen (auto-berekend vanuit quote_items)
  subtotal: number;
  tax_rate: number;                // Default 21% (BTW)
  tax_amount: number;
  total_amount: number;
  
  // Validiteit
  valid_until: date;               // Offerte vervaldatum
  sent_at: timestamp | null;
  accepted_at: timestamp | null;
  rejected_at: timestamp | null;
  
  // Timestamps
  created_at: timestamp;
  updated_at: timestamp;
}

interface QuoteItem {
  id: string;
  quote_id: string;                // FK naar quotes
  
  description: string;             // "Homepage ontwerp en ontwikkeling"
  quantity: number;                // 1
  unit_price: number;              // €2,500
  total: number;                   // quantity * unit_price
  
  sort_order: number;              // Voor volgorde in PDF
}
```

**Quote Number Format:**
- Pattern: `Q-{YEAR}-{SEQUENCE}`
- Voorbeelden: `Q-2026-001`, `Q-2026-142`
- Sequence reset elk jaar

#### 5. **Interactions** (Activiteiten)
Complete communicatie geschiedenis per bedrijf/contact.

**Velden:**
```typescript
interface Interaction {
  id: string;
  
  // Relaties
  company_id: string;
  contact_id: string | null;       // Optioneel specifiek contact
  project_id: string | null;       // Optionele project koppeling
  
  // Type & Inhoud
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  subject: string;                 // "Offerte besproken"
  notes: string | null;            // Details van gesprek
  
  // Planning
  scheduled_at: timestamp | null;  // Voor meetings/tasks
  completed_at: timestamp | null;  // Wanneer afgerond
  
  // Ownership
  user_id: string;                 // Wie heeft interactie gelogd
  
  // Timestamps
  created_at: timestamp;
}
```

**Dedicated Page:** `InteractionsPage.tsx`
- Volledige lijst van alle interacties
- Filters: type, company, contact, date range
- Create interaction dialog met company selector
- Timeline view per entity
- Export naar CSV

#### 6. **Notifications** (Meldingen)
Real-time notification systeem voor CRM events.

**Velden:**
```typescript
interface Notification {
  id: string;
  user_id: string;
  
  // Content
  title: string;                   // "Nieuwe offerte geaccepteerd"
  message: string;                 // Volledige beschrijving
  type: 'quote_accepted' | 'quote_rejected' | 'quote_expiring' | 
        'lead_assigned' | 'project_stage_changed' | 'deal_won' | 
        'deal_lost' | 'follow_up_reminder' | 'contact_created' | 
        'company_created';
  
  // Priority & Status
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'read' | 'archived';
  
  // Entity Linking
  related_entity_type: 'company' | 'contact' | 'project' | 'quote' | null;
  related_entity_id: string | null;
  deep_link: string | null;       // URL naar entity detail
  
  // Metadata
  is_digest: boolean;              // Onderdeel van daily digest?
  read_at: timestamp | null;
  created_at: timestamp;
}
```

**UI Components:**
- **NotificationBell** in header (badge met unread count)
- Popover met laatste 20 notificaties
- Mark as read / Delete actions
- Deep linking naar gerelateerde entities

#### 7. **Calendar Events** (Agenda)
Volledige calendar management geïntegreerd met Google Calendar.

**Velden:**
```typescript
interface CalendarEvent {
  id: string;
  user_id: string;
  
  // Event details
  title: string;
  description: string | null;
  event_type: 'meeting' | 'call' | 'deadline' | 'reminder' | 'other';
  
  // Timing
  start_time: timestamp;
  end_time: timestamp;
  all_day: boolean;
  
  // Display
  color: string;                   // Hex color voor categorisatie
  
  // Location
  location: string | null;
  is_virtual: boolean;
  meeting_url: string | null;      // Zoom/Teams link
  
  // Recurrence (future)
  recurrence_rule: string | null;  // iCal RRULE format
  
  created_at: timestamp;
}
```

**CalendarPage Features:**
- Month/Week/Day views (react-big-calendar)
- Drag & drop event scheduling
- Google Calendar 2-way sync
- Event creation met company/contact linking
- Mobile horizontal date picker
- Export to .ics
- Meeting URL generation (Zoom/Teams)

#### 8. **Workflows** (Automatisering)
Visual workflow builder voor automatisering zonder code.

**Tables:**
```sql
-- workflow_definitions: Workflow templates
CREATE TABLE workflow_definitions (
  id uuid PRIMARY KEY,
  name varchar(255),
  description text,
  trigger_type varchar(100),     -- 'manual', 'schedule', 'webhook', 'database_event'
  trigger_config jsonb,           -- Trigger specifieke configuratie
  nodes jsonb,                    -- Workflow nodes (visual diagram)
  edges jsonb,                    -- Connections tussen nodes
  is_active boolean,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp,
  updated_at timestamp
);

-- workflow_executions: Execution history
CREATE TABLE workflow_executions (
  id uuid PRIMARY KEY,
  workflow_id uuid REFERENCES workflow_definitions(id),
  status varchar(50),            -- 'running', 'completed', 'failed', 'cancelled'
  trigger_data jsonb,            -- Input data
  execution_log jsonb,           -- Step-by-step log
  started_at timestamp,
  completed_at timestamp,
  error_message text
);
```

**WorkflowBuilder Features:**
- Visual drag-and-drop node editor
- Node types: Trigger, Action, Condition, Wait
- Pre-built templates (follow-up reminders, quote expiry, etc.)
- Test execution met mock data
- Version control (save/restore)
- Execution history viewer

### Mobile UX Features

#### 1. **MobileBottomNav** 📱
Sticky bottom navigation voor touch-friendly mobile experience.

**Locatie:** Zichtbaar op schermen < 768px

```typescript
// src/components/layout/MobileBottomNav.tsx
const navItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Building2, label: 'Bedrijven', path: '/companies' },
  { icon: Users, label: 'Contacten', path: '/contacts' },
  { icon: TrendingUp, label: 'Pipeline', path: '/pipeline' },
];
```

**Features:**
- Active state highlighting (teal background)
- Icon + label voor duidelijkheid
- Fixed positioning (altijd zichtbaar bij scrollen)
- Safe area insets voor iOS notch

#### 2. **Swipe Gestures op Kaarten** 👆

**Project Cards** - Swipe voor quick actions:
```typescript
// src/features/projects/components/ProjectCard.tsx
<Card 
  onSwipeLeft={() => moveToNextStage(project.id)}
  onSwipeRight={() => moveToPreviousStage(project.id)}
>
  {/* Project content */}
</Card>
```

**Actions:**
- Swipe left → Verplaats naar volgende pipeline stage
- Swipe right → Terug naar vorige stage
- Visual feedback met Framer Motion animations

#### 3. **Touch-Friendly Charts** 📊

**Recharts Mobile Optimizations:**
```typescript
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={revenueData}>
    <XAxis 
      tick={{ fontSize: 12 }}        // Kleinere font op mobile
      interval="preserveStartEnd"    // Alleen start/end labels
    />
    <Tooltip 
      contentStyle={{ 
        touchAction: 'none'          // Prevent scroll tijdens hover
      }}
    />
  </LineChart>
</ResponsiveContainer>
```

**Aanpassingen:**
- Grotere touch targets (min 44x44px)
- Simplified tooltips
- Responsive font sizes
- Auto-hide minor gridlines

### Key Features in Detail

#### 🔖 Quote PDF Export

**Component:** `QuotePDFDocument.tsx` (370 lines)

**Generatie Flow:**
```typescript
import { PDFDownloadLink, Document, Page } from '@react-pdf/renderer';

<PDFDownloadLink
  document={<QuotePDFDocument quote={quote} company={company} />}
  fileName={`Offerte-${quote.quote_number}.pdf`}
>
  {({ loading }) => loading ? 'Genereren...' : 'Download PDF'}
</PDFDownloadLink>
```

**PDF Inhoud:**
1. **Header**
   - Bedrijfslogo (indien beschikbaar)
   - Dirq Solutions contactgegevens
   - Quote nummer en datum

2. **Klantgegevens**
   - Bedrijfsnaam
   - Contactpersoon
   - Adres
   - Email & telefoon

3. **Line Items Tabel**
   | Omschrijving | Aantal | Prijs | Totaal |
   |--------------|--------|-------|--------|
   | Homepage ontwerp | 1 | €2,500 | €2,500 |
   | Subpagina's (5x) | 5 | €800 | €4,000 |
   | CMS integratie | 1 | €1,500 | €1,500 |

4. **Berekeningen**
   ```
   Subtotaal:    €8,000
   BTW (21%):    €1,680
   ─────────────────────
   TOTAAL:       €9,680
   ```

5. **Footer**
   - Betalingsvoorwaarden (30 dagen)
   - Geldigheid (14 dagen)
   - Algemene voorwaarden

**Styling:**
- Professional layout met witruimte
- Dirq teal accent kleur (#06BDC7)
- A4 formaat optimized
- Print-friendly (zwart-wit compatibel)

#### 📄 Document Upload (Supabase Storage)

**Component:** `DocumentUpload.tsx` + `DocumentsList.tsx`

**Storage Bucket Setup:**
```sql
-- Bucket: 'documents'
-- Max file size: 10MB
-- Allowed types: PDF, Word, Excel, Images

CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Upload Flow:**
1. Drag & drop of file select
2. Client-side validatie:
   - File type check
   - Size limit (10MB)
   - Virus scan (future)
3. Upload met progress indicator
4. Metadata opslaan in `documents` tabel:
   ```typescript
   {
     id: uuid,
     company_id: string,       // Of contact_id, project_id
     file_name: string,
     file_size: number,
     file_type: string,
     storage_path: string,     // S3-achtige path
     uploaded_by: uuid,
     uploaded_at: timestamp
   }
   ```
5. Success toast met preview link

**Supported File Types:**
- **Documents:** PDF, DOC, DOCX, XLS, XLSX, TXT
- **Images:** JPG, PNG, GIF, WebP, SVG
- **Compressed:** ZIP, RAR

**Security:**
- RLS policies per user/role
- Signed URLs met expiry (1 uur)
- ADMIN kan alle documenten verwijderen
- Uploaders kunnen eigen documenten verwijderen

#### 📅 Google Calendar Sync

**Component:** `CalendarExportButton.tsx`

**Functionaliteit:**
- Export interacties naar Google Calendar
- .ics bestand generatie voor universele compatibiliteit
- Automatische timezone conversie (Europe/Amsterdam)

**Export Flow:**
```typescript
const exportToCalendar = (interaction: Interaction) => {
  const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dirq Solutions//CRM//EN
BEGIN:VEVENT
UID:${interaction.id}@dirqsolutions.nl
DTSTAMP:${formatDateToICS(new Date())}
DTSTART:${formatDateToICS(interaction.scheduled_at)}
SUMMARY:${interaction.subject}
DESCRIPTION:${interaction.notes}
LOCATION:${company.address}
END:VEVENT
END:VCALENDAR
  `.trim();
  
  downloadFile(icsContent, `meeting-${interaction.id}.ics`);
};
```

**Use Cases:**
- Sales meetings plannen
- Follow-up calls schedulen
- Project deadlines blokkeren
- Client presentations

---

## 🎨 Alle CRM Pagina's & Features

### Core CRM Modules ✅ (Production Ready)

| Pagina | Route | Beschrijving | Status |
|--------|-------|--------------|--------|
| **CompaniesPage** | `/companies` | Bedrijvenoverzicht met filters, search, CSV export/import | ✅ Live |
| **CompanyDetailPage** | `/companies/:id` | Company profiel met tabs (contacten, projecten, interacties, documenten) | ✅ Live |
| **ContactsPage** | `/contacts` | Contactpersonen beheer met company linking, CSV export/import | ✅ Live |
| **ContactDetailPage** | `/contacts/:id` | Contact profiel met interactie historie en linked entities | ✅ Live |
| **ProjectsPage** | `/projects` | Projects lijst met filters, CSV export | ✅ Live |
| **ProjectDetailPage** | `/projects/:id` | Project detail met quotes, documents, activity timeline | ✅ Live |
| **PipelinePage** | `/pipeline` | Kanban board met drag & drop voor sales stages | ✅ Live |
| **QuotesPage** | `/quotes` | Offertes overzicht met search, filters, CSV export | ✅ Live |
| **QuoteDetailPage** | `/quotes/:id` | Quote detail met line items, PDF export, status workflow | ✅ Live |
| **InteractionsPage** | `/interactions` | Alle CRM activiteiten (calls, emails, meetings, notes) | ✅ Live |

### Dashboard Pagina's ✅

| Pagina | Route | Toegang | Beschrijving |
|--------|-------|---------|--------------|
| **DashboardCRM** | `/dashboard` | SALES, MANAGER, ADMIN | Real-time pipeline metrics, revenue charts, quote analytics | ✅ Live |
| **DashboardExecutive** | `/dashboard/executive` | ADMIN, super_admin | Business KPIs, team performance, revenue forecasting | ✅ Live |
| **DashboardSuperAdmin** | `/dashboard/super-admin` | super_admin | System overview, user management, audit logs | ✅ Live |

### Utility & Admin Pagina's 🔧

| Pagina | Route | Beschrijving | Status |
|--------|-------|--------------|--------|
| **SettingsPage** | `/settings` | App settings, theme toggle, user preferences | ✅ Live |
| **GebruikersbeheerPage** | `/users` | User management voor ADMIN (create, edit, delete users) | ✅ Live |
| **CalendarPage** | `/calendar` | Full calendar view met Google Calendar sync | ✅ Live |
| **AIChatPage** | `/ai-chat` | AI assistant voor natural language CRM queries | 🚧 Beta |
| **WorkflowBuilder** | `/workflows/builder` | Visual workflow automation builder | 🚧 Beta |
| **WorkflowExecutions** | `/workflows/executions` | Workflow execution history en logs | 🚧 Beta |
| **WorkflowTemplatesPage** | `/workflows/templates` | Pre-built workflow templates | 🚧 Beta |
| **DocumentProcessing** | `/documents/processing` | OCR en document analysis | 🚧 Beta |
| **DocumentTemplatesPage** | `/documents/templates` | Document templates voor contracts/quotes | 🚧 Beta |

### Auth & Error Pagina's 🔐

| Pagina | Route | Beschrijving |
|--------|-------|--------------|
| **Auth** | `/auth` | Login/Signup met Supabase Auth |
| **ForgotPassword** | `/forgot-password` | Password reset flow |
| **ResetPassword** | `/reset-password` | New password na reset link |
| **Index** | `/` | Landing page (redirect naar dashboard) |
| **NotFound** | `*` | 404 pagina |

### Key UI Components 🧩

#### Layout Components
```
src/components/layout/
├── AppLayout.tsx          # Main layout wrapper met sidebar
├── AppSidebar.tsx         # Navigation sidebar (desktop)
├── MobileBottomNav.tsx    # Mobile navigation bar
└── DashboardHeader.tsx    # Page header met breadcrumbs
```

#### Feature Components
```
src/components/
├── NotificationBell.tsx       # Notification center in header
├── ThemeToggle.tsx            # Dark/light mode switcher
├── UserManagement.tsx         # User CRUD component
├── CreateUserDialog.tsx       # New user dialog
├── CSVImportDialog.tsx        # Generic CSV importer (470 lines)
├── ActivityLog.tsx            # Activity feed component
├── CalendarExportButton.tsx   # Export events to .ics
├── ErrorBoundary.tsx          # Error handling wrapper
├── LoadingScreen.tsx          # App-wide loading state
├── PullToRefresh.tsx          # Mobile pull-to-refresh
└── DirqLogo.tsx               # Brand logo component
```

#### Document Management
```
src/components/documents/
├── DocumentUpload.tsx         # File upload met drag & drop
├── DocumentsList.tsx          # File listing met preview
└── UniversalDocumentGenerator.tsx  # Dynamic PDF generation
```

#### Calendar Components
```
src/components/calendar/
├── CreateEventDialog.tsx      # New event form
├── EventDetailDialog.tsx      # Event detail view
├── CalendarFilters.tsx        # Filter by type, user, etc.
├── HorizontalDatePicker.tsx   # Mobile date swiper
└── GoogleCalendarSync.tsx     # OAuth + sync logic
```

#### Workflow Components
```
src/components/workflow/
├── WorkflowCanvas.tsx         # React Flow canvas
├── NodeConfigurator.tsx       # Node settings panel
├── TriggerNode.tsx            # Workflow trigger node
├── ActionNode.tsx             # Action node (create, update, etc.)
├── ConditionNode.tsx          # If/else logic node
└── WaitNode.tsx               # Time delay node
```

#### Notification Components
```
src/components/notifications/
├── NotificationCard.tsx       # Single notification item
├── NotificationList.tsx       # List view
└── NotificationSettings.tsx   # Preference management
```

### Advanced Features 🚀

#### 1. **AI Chat Assistant** 🤖
**Status:** 🚧 Beta (AIChatPage.tsx)

**Features:**
- Natural language queries: "Hoeveel deals hebben we deze maand?"
- Quick action chips voor common queries
- Chat history met context
- Future: GPT-4 integration voor intelligent responses

**Example Queries:**
```
- "Laat mijn sales pipeline zien"
- "Welke offertes zijn verstuurd?"
- "Toon bedrijven in mijn portfolio"
- "Welke contacten moet ik bellen?"
```

#### 2. **Workflow Automation** ⚙️
**Status:** 🚧 Beta (WorkflowBuilder.tsx - 740 lines)

**Node Types:**
- **Trigger:** Database event, schedule, webhook, manual
- **Action:** Create/update entity, send email, HTTP request
- **Condition:** If/else branching op data
- **Wait:** Time delay (minuten, uren, dagen)

**Pre-built Templates:**
```typescript
const templates = [
  {
    name: "Quote Follow-up",
    description: "Send reminder 3 days after quote sent",
    nodes: [
      { type: 'trigger', config: { event: 'quote.sent' } },
      { type: 'wait', config: { duration: '3d' } },
      { type: 'condition', config: { field: 'status', operator: '==', value: 'sent' } },
      { type: 'action', config: { action: 'create_notification', message: 'Follow up needed' } }
    ]
  },
  {
    name: "Lead Assignment",
    description: "Auto-assign new leads round-robin",
    nodes: [
      { type: 'trigger', config: { event: 'company.created', filter: { status: 'prospect' } } },
      { type: 'action', config: { action: 'assign_owner', method: 'round_robin' } },
      { type: 'action', config: { action: 'create_notification', recipient: 'owner' } }
    ]
  }
];
```

**Execution Engine:**
```typescript
// lib/workflows/engine.ts
class WorkflowEngine {
  async execute(workflow: WorkflowDefinition, context: any) {
    const execution = this.createExecution(workflow);
    
    for (const node of workflow.nodes) {
      try {
        const result = await this.executeNode(node, context);
        execution.log.push({ node: node.id, status: 'success', result });
        context = { ...context, ...result };
      } catch (error) {
        execution.log.push({ node: node.id, status: 'error', error });
        break;
      }
    }
    
    return execution;
  }
}
```

#### 3. **Document Processing** 📄
**Status:** 🚧 Beta (DocumentProcessing.tsx)

**Features:**
- OCR text extraction (Tesseract.js)
- PDF parsing en data extraction
- Auto-classify documents (contract, invoice, etc.)
- Metadata extraction (dates, amounts, parties)

**Use Cases:**
- Scan business cards → Auto-create contacts
- Extract invoice data → Create quote items
- Parse contracts → Extract key terms

#### 4. **Advanced Analytics** 📊
**Components:**
- **CostAnalyticsDashboard** - Cost tracking per project
- **RevenueAnalytics** - Trend analysis met forecasting
- **TeamPerformance** - Sales rep leaderboards
- **ConversionFunnels** - Stage-to-stage conversion rates

#### 5. **Notification System** 🔔
**Status:** ✅ Production Ready

**10 Notification Types:**
```typescript
type NotificationType =
  | 'quote_accepted'       // 🎉 Customer accepted quote
  | 'quote_rejected'       // ❌ Customer declined
  | 'quote_expiring'       // ⏰ Quote expires soon (3 days)
  | 'lead_assigned'        // 👤 New lead assigned to you
  | 'project_stage_changed'// 📊 Deal moved in pipeline
  | 'deal_won'            // 🏆 Project went live!
  | 'deal_lost'           // 😔 Deal marked as lost
  | 'follow_up_reminder'  // 📅 Time to follow up
  | 'contact_created'     // 👥 New contact added
  | 'company_created';    // 🏢 New company in CRM
```

**Notification Helpers:** (`lib/crmNotifications.ts` - 200 lines)
```typescript
// Auto-create notifications on events
export const createQuoteAcceptedNotification = async (quote: Quote) => {
  await supabase.from('notifications').insert({
    user_id: quote.owner_id,
    title: 'Offerte Geaccepteerd! 🎉',
    message: `${quote.companies.name} heeft offerte ${quote.quote_number} geaccepteerd.`,
    type: 'quote_accepted',
    priority: 'high',
    related_entity_type: 'quote',
    related_entity_id: quote.id,
    deep_link: `/quotes/${quote.id}`,
  });
};

// Batch notifications voor daily digest
export const sendDailyDigest = async (userId: string) => {
  const pendingNotifications = await getUnreadNotifications(userId);
  
  if (pendingNotifications.length > 0) {
    await supabase.from('notifications').insert({
      user_id: userId,
      title: `Daily Summary (${pendingNotifications.length} items)`,
      message: summarizeNotifications(pendingNotifications),
      type: 'follow_up_reminder',
      priority: 'medium',
      is_digest: true,
    });
  }
};
```

**UI Features:**
- Badge in header met unread count
- Dropdown met laatste 20 notificaties
- Mark as read / Delete actions
- Click to navigate (deep linking)
- Priority colors (high=red, medium=yellow, low=gray)

---

## 🔧 Advanced Components & Utilities

### Custom Hooks 🪝

```typescript
// src/hooks/
├── useAuth.tsx              # Auth context + user state
├── usePermissions.ts        # RBAC permission checks
├── useDebounce.ts           # Debounced search inputs
├── useMediaQuery.ts         # Responsive breakpoints
├── usePagination.ts         # Generic pagination logic
├── useLocalStorage.ts       # Persist state to localStorage
└── useNotifications.ts      # Notification state management
```

**Example: Permission Hook**
```typescript
// hooks/usePermissions.ts
export const usePermissions = () => {
  const { user } = useAuth();
  
  const canEdit = (entity: any) => {
    if (user.role === 'super_admin' || user.role === 'ADMIN') return true;
    return entity.owner_id === user.id;
  };
  
  const canDelete = () => {
    return user.role === 'super_admin' || user.role === 'ADMIN';
  };
  
  const canViewAll = () => {
    return ['super_admin', 'ADMIN', 'MANAGER'].includes(user.role);
  };
  
  return { canEdit, canDelete, canViewAll };
};
```

### Utility Libraries 🛠️

```typescript
// src/lib/
├── supabase.ts              # Supabase client singleton
├── queryClient.ts           # React Query configuration
├── formatters.ts            # Date, currency, number formatters
├── crmNotifications.ts      # Notification helper functions
├── exportUtils.ts           # CSV/Excel export logic
├── validation.ts            # Zod schemas per entity
└── workflows/               # Workflow engine
    ├── engine.ts            # Execution engine
    ├── nodes.ts             # Node type implementations
    └── types.ts             # Workflow TypeScript types
```

**Example: Formatters**
```typescript
// lib/formatters.ts
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

export const formatDate = (date: Date | string): string => {
  return format(new Date(date), 'dd MMM yyyy', { locale: nl });
};

export const formatRelativeTime = (date: Date | string): string => {
  return formatDistanceToNow(new Date(date), { 
    addSuffix: true, 
    locale: nl 
  });
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
```

### Design System Tokens 🎨

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          DEFAULT: '#06BDC7',   // Dirq teal
          50: '#E6F9FA',
          100: '#CCF3F5',
          500: '#06BDC7',
          600: '#059BA3',
          700: '#047A7F',
        },
        
        // Semantic colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        
        // Status colors (projects)
        'status-lead': '#3B82F6',
        'status-quote': '#8B5CF6',
        'status-won': '#10B981',
        'status-lost': '#EF4444',
      },
      
      // Typography
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      // Spacing scale
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '120': '30rem',
      },
      
      // Animations
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-in',
      },
    },
  },
};
```

### shadcn/ui Components Library 📦

**Geïnstalleerde componenten (50+):**
```
src/components/ui/
├── accordion.tsx          ├── alert-dialog.tsx      ├── alert.tsx
├── aspect-ratio.tsx       ├── avatar.tsx            ├── badge.tsx
├── button.tsx             ├── calendar.tsx          ├── card.tsx
├── checkbox.tsx           ├── collapsible.tsx       ├── command.tsx
├── context-menu.tsx       ├── dialog.tsx            ├── dropdown-menu.tsx
├── form.tsx               ├── hover-card.tsx        ├── input.tsx
├── label.tsx              ├── menubar.tsx           ├── navigation-menu.tsx
├── popover.tsx            ├── progress.tsx          ├── radio-group.tsx
├── scroll-area.tsx        ├── select.tsx            ├── separator.tsx
├── sheet.tsx              ├── skeleton.tsx          ├── slider.tsx
├── switch.tsx             ├── table.tsx             ├── tabs.tsx
├── textarea.tsx           ├── toast.tsx             ├── toaster.tsx
├── toggle-group.tsx       ├── toggle.tsx            ├── tooltip.tsx
└── ... (+ custom variants)
```

**Component Patterns:**
- Fully accessible (ARIA compliant)
- Keyboard navigation support
- Dark mode compatible
- Customizable via Tailwind classes
- TypeScript typed props



---

## 🔗 Integratie & Automatisering Matrix

Deze sectie beschrijft de verdeling van verantwoordelijkheden tussen de CRM-app zelf, n8n (workflow orchestrator) en Manus (AI agent).

### **In-App** (CRM Eigen Verantwoordelijkheid)

✅ **Wat de app ZELF afhandelt:**

#### 1. Data Integriteit & Validatie
```typescript
// Form validatie met Zod schemas
const companySchema = z.object({
  name: z.string().min(2, "Minimaal 2 karakters"),
  email: z.string().email("Ongeldig email").optional(),
  website: z.string().url("Moet een geldige URL zijn").optional(),
  status: z.enum(['prospect', 'customer', 'partner', 'inactive']),
});
```

**Waarom in-app?**
- Directe gebruikersfeedback
- Voorkomt ongeldige data in database
- Snellere UX (geen server roundtrip)

#### 2. PDF Generatie (Quotes)
```typescript
// Real-time PDF rendering in browser
<PDFDownloadLink document={<QuotePDFDocument quote={quote} />}>
  Download Offerte
</PDFDownloadLink>
```

**Waarom in-app?**
- Instant preview zonder wachttijd
- Geen server resources nodig
- Customizatie mogelijk door gebruiker

#### 3. UI Interacties & Feedback
- Real-time search filtering
- Drag & drop pipeline board
- Toast notifications voor acties
- Loading states en skeletons
- Form error handling

**Waarom in-app?**
- Gebruiker verwacht immediate feedback
- Geen latency tussen actie en response

#### 4. RBAC Permission Checks
```typescript
const canDeleteCompany = (user: User, company: Company) => {
  if (user.role === 'super_admin' || user.role === 'ADMIN') return true;
  return user.id === company.owner_id;
};
```

**Waarom in-app?**
- Security laag #1 (defense in depth)
- UI aanpassingen per role
- Backed by RLS in database

### **n8n - The Orchestrator** 🔄

⚙️ **Waar n8n wordt ingezet:**

#### 1. Status-Based Workflow Triggers

**Quote Sent → Follow-up Reminder**
```
Trigger: Quote status = 'sent'
├── Wait 3 dagen
├── Check: Status nog steeds 'sent'?
└── IF yes → Create interaction (type: task)
    └── Notification aan owner: "Follow-up needed"
```

**Project Stage Change → Team Notification**
```
Trigger: Project.stage changed
├── IF stage = 'quote_signed'
│   └── Notify development team
│       └── Create task in project management tool
├── IF stage = 'live'
│   └── Send celebration email to team
│       └── Update company status to 'customer'
└── Log event in crm_audit_log
```

#### 2. Automatische Data Verrijking

**New Company Created → Enrich Data**
```
Trigger: companies.INSERT
├── Lookup company via Clearbit API
│   ├── Get logo URL
│   ├── Get employee count
│   └── Get social media links
├── Update companies tabel
└── Create notification: "Company enriched"
```

**Website URL Added → Scrape Metadata**
```
Trigger: Project.website_url updated
├── Scrape website (Puppeteer node)
│   ├── Extract meta description
│   ├── Get screenshot
│   └── Check SEO score
├── Save metadata
└── Create interaction note
```

#### 3. Scheduled Jobs & Reminders

**Daily Pipeline Health Check**
```
Schedule: Every day 9:00 AM
├── Query all projects WHERE stage = 'negotiation'
│   └── AND expected_close_date < TODAY + 7 days
├── FOR EACH project:
│   └── Create notification to owner
│       └── "Deal closing soon - action needed"
```

**Quote Expiration Warnings**
```
Schedule: Every day 10:00 AM
├── Query quotes WHERE valid_until BETWEEN TODAY AND TODAY + 3
│   └── AND status = 'sent'
├── FOR EACH quote:
│   └── Send email to sales rep
│       └── "Quote expiring in X days"
```

#### 4. External System Integration

**Zapier/Make Alternative Workflows:**
- Slack notifications voor won deals
- Trello/Asana task creation bij nieuwe projecten
- Google Sheets sync voor reporting
- WhatsApp Business API voor client updates
- Email marketing platform sync (Mailchimp/SendGrid)

**Webhook Endpoints:**

✅ **Production Ready: AI Webhook Handler** (Januari 2026)

```typescript
// Supabase Edge Function: api-webhook-handler
POST https://[project-ref].supabase.co/functions/v1/api-webhook-handler

Headers:
  X-API-Key: [secure-api-key]
  User-Agent: n8n-workflow/1.0 | Manus-AI/2.0
  Content-Type: application/json

Supported Actions:
  - create_lead      → Maak nieuwe lead (project) aan
  - create_company   → Maak nieuw bedrijf aan
  - create_contact   → Maak nieuw contact aan
  - add_note         → Voeg notitie toe aan entiteit

Features:
  ✅ Type-safe payload validatie
  ✅ Automatische sales rep notificaties
  ✅ Audit logging met AI-detectie (n8n, Manus)
  ✅ RLS security enforcement
  ✅ 4 kant-en-klare n8n workflow templates
```

**Voorbeeld: Create Lead via n8n**
```json
{
  "action": "create_lead",
  "source": "n8n",
  "data": {
    "company_name": "Acme Corp",
    "title": "Website redesign project",
    "project_type": "corporate_website",
    "value": 8500,
    "contact_email": "info@acme.com",
    "contact_name": "John Doe",
    "priority": "high",
    "tags": ["inbound", "urgent"]
  }
}
```

**Documentatie:**
- Complete guide: `supabase/functions/api-webhook-handler/README.md`
- n8n templates: `supabase/functions/api-webhook-handler/N8N_TEMPLATES.md`
- Quick reference: `supabase/functions/api-webhook-handler/QUICK_REFERENCE.md`
- Test suite: `supabase/functions/api-webhook-handler/test.ts`

**ROI: €46.280/jaar** (automatisering van lead entry, LinkedIn inbound, Manus AI qualification)

#### 5. Data Backup & Audit

**Daily Database Snapshots**
```
Schedule: Every day 2:00 AM
├── Export critical tables to CSV
│   ├── companies, contacts, projects, quotes
├── Upload to S3/Google Drive
└── Verify backup integrity
```

### **Manus - The AI Agent** 🤖

🧠 **De rol van Manus (AI-gedreven autonome agent):**

#### 1. Lead Scraping & Qualification

**Autonome Lead Generatie:**
```
Input: Target criteria (industrie, locatie, bedrijfsgrootte)
│
Process:
├── Scrape bedrijvenregisters (KVK, LinkedIn, Google)
├── Extract contactgegevens (email patterns)
├── AI scoring: Fit voor Dirq Solutions? (0-100)
│   ├── Heeft bedrijf al een website?
│   ├── Wanneer laatste update?
│   └── Technologie stack detectie
└── CREATE lead in CRM (alleen > 70 score)
    └── Assign naar sales rep (round-robin)
```

**Output naar CRM:**
- New company record (status: prospect)
- AI-generated notes met lead score en reasoning
- Suggested first contact approach

#### 2. Gepersonaliseerde Outreach Schrijven

**AI Cold Email Generator:**
```
Input: Company + Contact data
│
Process:
├── Analyze company website & social media
├── Identify pain points (slow website, bad UX)
├── Find common connections (LinkedIn mutual)
├── Research recent company news
└── Generate personalized email
    ├── Subject line (A/B test variants)
    ├── Body (120-150 woorden, casual tone)
    └── CTA (Demo aanvragen of prijs offerte)
```

**Voorbeeld Output:**
```
Subject: Quick website snelheid check voor [Bedrijf]

Hoi [Voornaam],

Ik zag dat [Bedrijf] recent [recent nieuws] - gefeliciteerd!

Tijdens mijn research viel me op dat jullie website ca. 4.5s laadt 
(Google PageSpeed: 52/100). Voor de meeste bezoekers betekent dit 
dat ze afhaken voordat jullie verhaal geladen is.

Bij Dirq Solutions hebben we [vergelijkbaar bedrijf] geholpen hun 
load time naar < 1s te brengen (+180% conversie).

Zin in een 15-min call om jullie site door te nemen? Geen sales 
pitch - gewoon concrete tips die jullie team direct kan toepassen.

Groet,
[Sales rep naam]
```

**AI Training Data:**
- Historische emails met hoge response rate
- Won deals analyse (wat triggerde beslissing?)
- Lost deals feedback (waarom geen interesse?)

#### 3. Email Onderhandelingen & Agenda Planning

**Autonomous Email Agent:**
```
Scenario: Lead antwoordt "Ik heb interesse, maar pas Q2 budget"
│
Manus Actions:
├── Interpret intent: Genuine interest, budget constraint
├── Suggested response:
│   └── "Begrijpelijk! Zullen we alvast een intake doen zodat 
│       we Q2 direct kunnen starten? Ik blokkeer alvast een 
│       spot voor april."
├── IF positive reply:
│   ├── Detect availability patterns in email
│   ├── Cross-check sales rep Google Calendar
│   ├── Suggest 3 time slots
│   └── Send calendar invite (via n8n webhook)
└── UPDATE CRM:
    ├── Project stage → 'quote_requested'
    ├── Expected close date → Q2 2026
    └── Add interaction note

**Human Handoff:**
- Complex negotiations → Escalatie naar sales rep
- Budget approval > €10k → Manager review required
- Multi-stakeholder beslissingen → Schedule group meeting

#### 4. Sentiment Analysis & Deal Risk Prediction

**Email Communication Monitoring:**
```
Trigger: New email exchange gelogd
│
Manus Analysis:
├── Sentiment score (-1.0 tot +1.0)
│   ├── Negative indicators: "te duur", "andere opties", "budget issues"
│   ├── Positive indicators: "enthousiast", "perfect", "wanneer starten"
│   └── Neutral: Vraagt technische details
├── Deal risk assessment:
│   ├── LOW: Positive sentiment + quick responses
│   ├── MEDIUM: Mixed signals + delays
│   └── HIGH: Negative sentiment + ghosting pattern
└── Action recommendation:
    ├── IF HIGH risk: Alert sales rep + suggest discount/incentive
    ├── IF MEDIUM: Schedule check-in call
    └── IF LOW: Continue standard follow-up
```

**CRM Integration:**
- Risk score badge op project kaart (🟢🟡🔴)
- Automated notes: "AI Insight: Klant vermeldt concurrent [Naam]"
- Suggested next best action in UI

#### 5. Competitive Intelligence

**Market Research Automation:**
```
Scheduled: Weekly
│
Process:
├── Monitor competitor websites voor pricing changes
├── Track LinkedIn job postings (expansion signals)
├── Google Alerts voor company mentions
├── Review G2/Capterra reviews (pain points)
└── Summary report naar management:
    ├── Competitor X verlaagde prijzen 15%
    ├── New market entrant: [Bedrijf]
    └── Common customer complaint: [Theme]
```

### 🔗 Integration Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       DIRQ CRM (In-App)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   React UI  │  │  Supabase   │  │   Storage   │        │
│  │  Components │→ │     RLS     │→ │  (Docs/PDF) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                 │                                 │
│         └─────────────────┘                                 │
│               │                                              │
└───────────────┼──────────────────────────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │   Webhooks    │ (Supabase Database Webhooks)
        └───────┬───────┘
                │
    ┌───────────┼──────────────┐
    │           │              │
    ▼           ▼              ▼
┌────────┐  ┌────────┐   ┌──────────┐
│  n8n   │  │ Manus  │   │ External │
│ Flows  │  │   AI   │   │   APIs   │
└────┬───┘  └────┬───┘   └────┬─────┘
     │           │            │
     │           │            │
     └───────────┴────────────┘
                 │
                 ▼
         ┌──────────────┐
         │  CRM Updates │ (via Supabase REST API)
         └──────────────┘
```

**Communication Flow:**
1. **CRM → n8n:** Database webhooks voor status changes
2. **n8n → CRM:** REST API calls voor data updates
3. **Manus → CRM:** API integration voor lead creation
4. **n8n ↔ Manus:** Shared context via message queue

---

## 🔐 Database & Security

### RBAC (Role-Based Access Control)

**5 Role Hierarchy:**

```
super_admin  ─── Volledige systeem controle
    │
    └─ ADMIN  ─── Management & configuratie
          │
          ├─ SALES  ─── CRM operaties (CRUD)
          │
          ├─ MANAGER  ─── Team oversight (Read + Reports)
          │
          └─ SUPPORT  ─── Beperkte read access
```

#### Permissions Matrix

| Feature | super_admin | ADMIN | SALES | MANAGER | SUPPORT |
|---------|-------------|-------|-------|---------|---------|
| **Companies** | | | | | |
| - View All | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Edit All | ✅ | ✅ | Own only | ❌ | ❌ |
| - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Contacts** | | | | | |
| - View All | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Edit | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Delete | ✅ | ✅ | Own only | ❌ | ❌ |
| **Projects** | | | | | |
| - View All | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Edit Stage | ✅ | ✅ | Own only | ❌ | ❌ |
| - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Quotes** | | | | | |
| - View All | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Send | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Edit Draft | ✅ | ✅ | Own only | ❌ | ❌ |
| - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Dashboards** | | | | | |
| - CRM Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Executive Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Super Admin Dashboard | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Admin Functions** | | | | | |
| - User Management | ✅ | ✅ | ❌ | ❌ | ❌ |
| - System Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Audit Logs | ✅ | ✅ | ❌ | ✅ | ❌ |
| - Data Export | ✅ | ✅ | Own data | ✅ | ❌ |

### Row Level Security (RLS) Architectuur

**Database-Level Security met Supabase:**

#### 1. Companies RLS Policies

```sql
-- SELECT Policy (Who can view companies?)
CREATE POLICY "companies_select_policy" ON companies
  FOR SELECT USING (
    CASE 
      -- Admins see everything
      WHEN auth_user_role() IN ('super_admin', 'ADMIN', 'MANAGER') THEN TRUE
      
      -- Sales sees owned companies + assigned prospects
      WHEN auth_user_role() = 'SALES' THEN (
        owner_id = auth.uid() OR owner_id IS NULL
      )
      
      -- Support sees active customers only
      WHEN auth_user_role() = 'SUPPORT' THEN status = 'customer'
      
      ELSE FALSE
    END
  );

-- INSERT Policy (Who can create companies?)
CREATE POLICY "companies_insert_policy" ON companies
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('super_admin', 'ADMIN', 'SALES')
    AND owner_id = auth.uid()  -- Auto-assign to creator
  );

-- UPDATE Policy (Who can edit companies?)
CREATE POLICY "companies_update_policy" ON companies
  FOR UPDATE USING (
    CASE
      WHEN auth_user_role() IN ('super_admin', 'ADMIN') THEN TRUE
      WHEN auth_user_role() = 'SALES' THEN owner_id = auth.uid()
      ELSE FALSE
    END
  );

-- DELETE Policy (Who can delete companies?)
CREATE POLICY "companies_delete_policy" ON companies
  FOR DELETE USING (
    auth_user_role() IN ('super_admin', 'ADMIN')
  );
```

#### 2. Projects RLS Policies

```sql
-- SELECT: SALES sees own projects, MANAGER/ADMIN see all
CREATE POLICY "projects_select_policy" ON projects
  FOR SELECT USING (
    CASE
      WHEN auth_user_role() IN ('super_admin', 'ADMIN', 'MANAGER') THEN TRUE
      WHEN auth_user_role() = 'SALES' THEN (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM companies 
          WHERE companies.id = projects.company_id 
          AND companies.owner_id = auth.uid()
        )
      )
      ELSE FALSE
    END
  );

-- UPDATE: Only owner can change stage (except ADMIN)
CREATE POLICY "projects_update_policy" ON projects
  FOR UPDATE USING (
    auth_user_role() IN ('super_admin', 'ADMIN') OR
    (auth_user_role() = 'SALES' AND owner_id = auth.uid())
  )
  WITH CHECK (
    -- Prevent changing owner_id to someone else
    NEW.owner_id = OLD.owner_id OR
    auth_user_role() IN ('super_admin', 'ADMIN')
  );
```

#### 3. Helper Functions

```sql
-- Get current user's role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is admin or higher
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is sales or higher
CREATE OR REPLACE FUNCTION is_sales_or_above()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() IN ('super_admin', 'ADMIN', 'SALES', 'MANAGER')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### 🛡️ Security Hardening (Updated: Jan 7, 2026)

**Database Security Audit Complete:**

✅ **Fixed 21 SECURITY DEFINER Functions**
- All functions now have explicit `SET search_path = public, pg_catalog`
- Prevents search_path injection attacks
- Migration: `20260107_rls_security_hardening_fixes.sql`

✅ **Restored RLS Policies**
- Fixed CASCADE drops from function signature changes
- Companies: 4 policies (select, insert, update, delete)
- Contacts: 4 policies (select, insert, update, delete)
- Migration: `20260107_restore_dropped_policies.sql`

✅ **Supabase Linter Warnings**
- Reduced from 26 warnings → 8 warnings
- Remaining warnings are intentional (system operations)

**Security Features:**
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ SECURITY DEFINER functions protected
- ✅ Role-based access control (RBAC)
- ✅ Audit logging on critical tables
- ✅ Search path injection protection

### Database Schema (Core Tables)

#### **companies** (Bedrijven)
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  address TEXT,
  
  status VARCHAR(50) DEFAULT 'prospect',
  priority VARCHAR(50) DEFAULT 'medium',
  company_size VARCHAR(50),
  industry_id UUID REFERENCES industries(id),
  
  owner_id UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_industry ON companies(industry_id);
```

#### **contacts** (Contactpersonen)
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  
  position VARCHAR(100),
  department VARCHAR(100),
  
  is_primary BOOLEAN DEFAULT FALSE,
  is_decision_maker BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_email ON contacts(email);
```

#### **projects** (Sales Pipeline)
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  company_id UUID NOT NULL REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  owner_id UUID REFERENCES profiles(id),
  
  stage VARCHAR(50) DEFAULT 'lead',
  probability INTEGER DEFAULT 10,
  
  project_type VARCHAR(50),
  website_url VARCHAR(255),
  number_of_pages INTEGER,
  features TEXT[],  -- Array van strings
  
  value DECIMAL(12, 2) DEFAULT 0,
  expected_close_date DATE,
  actual_close_date DATE,
  
  hosting_included BOOLEAN DEFAULT FALSE,
  maintenance_contract BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_projects_owner ON projects(owner_id);
```

#### **quotes** (Offertes)
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  
  company_id UUID NOT NULL REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  project_id UUID REFERENCES projects(id),
  
  status VARCHAR(50) DEFAULT 'draft',
  
  subtotal DECIMAL(12, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 21.00,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_company ON quotes(company_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_number ON quotes(quote_number);
```

#### **quote_items** (Offerte Regels)
```sql
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
```

#### **interactions** (Activiteiten)
```sql
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  company_id UUID NOT NULL REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  project_id UUID REFERENCES projects(id),
  
  type VARCHAR(50) NOT NULL,  -- call, email, meeting, note, task
  subject VARCHAR(255) NOT NULL,
  notes TEXT,
  
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_company ON interactions(company_id);
CREATE INDEX idx_interactions_type ON interactions(type);
CREATE INDEX idx_interactions_scheduled ON interactions(scheduled_at);
```

#### **documents** (Document Management)
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Polymorphic relation (document kan bij company, contact of project horen)
  company_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  project_id UUID REFERENCES projects(id),
  
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,  -- Bytes
  file_type VARCHAR(100) NOT NULL,  -- MIME type
  storage_path VARCHAR(500) NOT NULL,  -- Supabase Storage path
  
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT documents_entity_check CHECK (
    (company_id IS NOT NULL)::INTEGER +
    (contact_id IS NOT NULL)::INTEGER +
    (project_id IS NOT NULL)::INTEGER = 1
  )
);

CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_contact ON documents(contact_id);
CREATE INDEX idx_documents_project ON documents(project_id);
```

#### **crm_audit_log** (Audit Trail)
```sql
CREATE TABLE crm_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,  -- INSERT, UPDATE, DELETE
  
  old_values JSONB,
  new_values JSONB,
  
  user_id UUID REFERENCES profiles(id),
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON crm_audit_log(table_name);
CREATE INDEX idx_audit_record ON crm_audit_log(record_id);
CREATE INDEX idx_audit_user ON crm_audit_log(user_id);
CREATE INDEX idx_audit_created ON crm_audit_log(created_at);
```

### Security Best Practices

#### 1. **Environment Variables**
```env
# .env (NEVER commit to git)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Public key (safe to expose)

# Supabase Dashboard Environment Variables (Server-side)
SUPABASE_SERVICE_ROLE_KEY=***  # NEVER expose to client!
DATABASE_URL=***
JWT_SECRET=***
```

#### 2. **Input Sanitization**
```typescript
// Zod schema validatie voorkomt SQL injection
const companySchema = z.object({
  name: z.string().max(255).regex(/^[a-zA-Z0-9\s&.-]+$/),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
});

// Supabase client escaped automatisch, maar double-check:
const { data, error } = await supabase
  .from('companies')
  .insert(validatedData);  // ✅ Safe
```

#### 3. **Storage Security**
```typescript
// Supabase Storage RLS policies
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

// File type validation
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword'
];

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('File type not allowed');
}
```

#### 4. **Rate Limiting** (Future Implementation)
```typescript
// Via n8n webhook of Supabase Edge Functions
export const rateLimiter = {
  // Max 10 login pogingen per IP per 15 minuten
  auth: { max: 10, window: 15 * 60 },
  
  // Max 100 API calls per gebruiker per minuut
  api: { max: 100, window: 60 },
  
  // Max 5 quote PDFs per minuut (resource-intensive)
  pdf: { max: 5, window: 60 },
};
```

---

## 🗺️ Roadmap - Fase 2 Upgrades

### Sprint 2: Advanced Features (Geschat: 20 uur)

#### 1. ✅ Lead-to-Customer Conversion Flow (COMPLEET)

**Status:** ✅ COMPLEET (Sprint 1)
- Company creation + edit forms
- Contact creation met company linking
- Project creation in pipeline
- Quote generator met line items
- Status workflows geïmplementeerd

#### 2. 🎯 Geavanceerde Filters (6 uur)

**Huidige Staat:** Basis filters (status, priority)

**Upgrade:**
```typescript
// Multi-dimensional filtering
interface AdvancedFilters {
  // Date range filters
  created_after?: Date;
  created_before?: Date;
  
  // Value range filters  
  value_min?: number;
  value_max?: number;
  
  // Array filters
  stages?: ProjectStage[];        // Multiple stages
  industries?: string[];          // Multiple industries
  features?: string[];            // Projects met specifieke features
  
  // Custom filters
  has_maintenance?: boolean;
  has_hosting?: boolean;
  is_overdue?: boolean;           // expected_close_date < TODAY
}
```

**UI Components:**
- Popover met filter builder
- Save filter presets ("Mijn Hot Leads", "Q1 Deals")
- URL param persistence (share filtered views)
- Clear all filters button

#### 3. 📊 CSV/Excel Advanced Rapportages (4 uur)

**Huidige Staat:** ✅ Basic CSV export (companies, contacts, quotes, projects)

**Upgrade:**
- **Excel Export:** Met styling, formules en meerdere sheets
- **Pivot Tables:** Automated revenue per industry/stage
- **Charts in Excel:** Embedded charts in export
- **Scheduled Reports:** Email weekly pipeline summary

**Example:**
```typescript
// Sheet 1: Pipeline Overview
companies | active_projects | total_value | weighted_value
--------------------------------------------------------------
Acme Corp | 3              | €45,000     | €27,000 (60%)

// Sheet 2: Quote Performance
month     | sent | accepted | declined | acceptance_rate
--------------------------------------------------------
Jan 2026  | 12   | 8        | 2        | 66.7%
```

#### 4. ✅ Audit Logging Volledige Activatie (COMPLEET)

**Status:** ✅ COMPLEET (Sprint 1 - Januari 2026)

**Implementatie:**
```sql
-- Complete audit system met AI detectie
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crm_audit_log (
    table_name, record_id, action,
    old_data, new_data, changed_fields,
    user_id, ip_address, user_agent
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    -- Array met gewijzigde velden
    ARRAY(SELECT key FROM jsonb_each(to_jsonb(OLD)) 
          WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key),
    auth.uid(),
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers actief op: companies, contacts, projects, quotes
-- AI Detectie: n8n Workflow, Manus AI, webhooks
```

**Features:**
- ✅ Tracking van alle INSERT/UPDATE/DELETE
- ✅ JSONB old_data en new_data
- ✅ IP-adres en user agent logging
- ✅ AI/automation detectie (Manus AI, n8n)
- ✅ Views: `v_audit_log_with_users`, `v_conversion_audit`
- ✅ Function: `get_audit_stats(start_date, end_date)`
- ✅ RLS policies per role (admin/manager/user)

**Documentatie:** `AUDIT_LOGGING_GUIDE.md`

---

#### 5. ✅ AI Webhook Handler voor Externe Integraties (COMPLEET)

**Status:** ✅ COMPLEET (Sprint 1 - Januari 2026)

**Edge Function:** `supabase/functions/api-webhook-handler/`

**Features:**
```typescript
POST /functions/v1/api-webhook-handler

Supported Actions:
  ✅ create_lead      - Maak nieuwe lead met company + contact
  ✅ create_company   - Maak nieuw bedrijf aan
  ✅ create_contact   - Maak nieuw contact aan
  ✅ add_note         - Voeg notitie toe aan entiteit

Security:
  ✅ API Key validation (X-API-Key header)
  ✅ Type-safe payload validatie tegen crm.ts
  ✅ CORS support voor webhook sources
  ✅ Audit logging met AI-detectie

Integraties:
  ✅ n8n (4 workflow templates)
  ✅ Manus AI (HTTP action config)
  ✅ Zapier/Make.com compatible
  ✅ Custom webhooks
```

**n8n Workflow Templates:**
1. Contact Form → CRM Lead (10h/week besparing)
2. LinkedIn Inbound → CRM Lead (3h/week besparing)
3. Calendar Booking → Lead + Task
4. HubSpot → Supabase Sync

**Automatische Notificaties:**
- Lead assigned → Sales rep notification
- Company created → Owner notification
- Contact added → Team notification

**ROI:** €46.280/jaar (automatisering lead entry + qualification)

**Documentatie:**
- Complete guide: `supabase/functions/api-webhook-handler/README.md` (850+ lines)
- n8n templates: `N8N_TEMPLATES.md` (550+ lines)
- Quick reference: `QUICK_REFERENCE.md` (250+ lines)
- Test suite: `test.ts` (400+ lines, 20+ tests)
- Deployment: `deploy.sh` / `deploy.ps1`

**Deployment:**
```powershell
# Windows
.\supabase\functions\api-webhook-handler\deploy.ps1

# Linux/Mac
./supabase/functions/api-webhook-handler/deploy.sh
```

---

#### 6. 📧 Email Template System (4 uur)

**Goal:** Reusable email templates voor outreach

**Templates:**
```typescript
interface EmailTemplate {
  id: string;
  name: string;                  // "Cold Outreach - Website Relaunch"
  subject: string;               // "Quick website check voor {{company.name}}"
  body: string;                  // HTML met {{variables}}
  category: 'cold' | 'follow-up' | 'quote' | 'won' | 'lost';
  
  // Template variables
  variables: {
    company_name: 'companies.name',
    contact_first_name: 'contacts.first_name',
    quote_total: 'quotes.total_amount',
    // ... etc
  };
}
```

**Features:**
- WYSIWYG editor (TipTap/Quill)
- Variable autocomplete ({{contact.first_name}})
- Preview met real data
- A/B test tracking (response rates per template)
- Send direct vanuit CRM (via n8n webhook naar email provider)

### Sprint 3: AI Integration (Geschat: 15 uur)

#### 1. 🤖 AI Lead Scoring (5 uur)

**Goal:** Automatisch scores geven aan leads (0-100)

**Factors:**
```typescript
interface LeadScore {
  company_size: number;          // 0-20 points (groter = hoger score)
  industry_fit: number;          // 0-20 points (target industries)
  website_quality: number;       // 0-15 points (PageSpeed, mobile)
  budget_signals: number;        // 0-15 points (hiring, funding news)
  engagement: number;            // 0-15 points (email opens, replies)
  timing: number;                // 0-15 points (website age, recent changes)
  
  total: number;                 // Sum (0-100)
  grade: 'A' | 'B' | 'C' | 'D';  // A: 80+, B: 60-79, C: 40-59, D: <40
}
```

**Implementation:**
- Train model op historical won/lost deals
- Manus AI integration voor data enrichment
- Real-time score updates bij nieuwe data
- Score badge op company kaarten (🟢A, 🟡B, 🔴D)

#### 2. 💬 AI Chat Assistent (6 uur)

**Goal:** Natural language queries voor CRM data

**Voorbeelden:**
```
User: "Hoeveel deals hebben we deze maand gewonnen?"
AI: "Deze maand zijn er 8 deals gewonnen met een totale waarde 
     van €127,500. Dat is 23% meer dan vorige maand."

User: "Laat bedrijven zien met hoge scores maar geen quotes"
AI: [Toont gefilterde lijst met 12 bedrijven]
    "Wil je dat ik outreach emails genereer voor deze leads?"
```

**Tech Stack:**
- OpenAI GPT-4 voor NLP
- Function calling voor CRM actions
- Chat history persistence
- Suggested follow-up questions

#### 3. 📈 Predictive Analytics (4 uur)

**Goal:** Forecast revenue en deal close rates

**Models:**
- **Monthly Revenue Forecast:** Op basis van historical data + weighted pipeline
- **Deal Close Probability:** ML model based on historical patterns
- **Churn Risk:** Identify customers likely to leave
- **Best Next Action:** Suggest what to do per lead (AI-driven)

**UI:**
```typescript
<Card>
  <CardHeader>Revenue Forecast Q1 2026</CardHeader>
  <CardContent>
    <LineChart>
      {/* Actual revenue (januari) */}
      {/* Forecasted revenue (feb, maart) met confidence interval */}
    </LineChart>
    <p>Verwachte omzet: €45,000 ± €8,000 (83% confidence)</p>
    <Badge>On track to hit target</Badge>
  </CardContent>
</Card>
```

### Sprint 4: External Integrations (Geschat: 12 uur)

#### 1. 📧 Gmail/Outlook Sync (5 uur)

**Goal:** Automatisch emails loggen als interacties

**Flow:**
```
1. User connects Gmail via OAuth 2.0
2. n8n polls for new emails (every 5 min)
3. Match email sender to CRM contact (by email)
4. IF match found:
   └── Create interaction (type: email)
       └── Subject: email subject
       └── Notes: email body (first 500 chars)
5. Show in contact detail timeline
```

**Features:**
- Two-way sync (send emails vanuit CRM)
- Email templates integratie
- Attachment auto-upload naar documents
- Unsubscribe link compliance

#### 2. 📅 Advanced Calendar Integration (4 uur)

**Huidige Staat:** ✅ Export naar .ics bestand

**Upgrade:**
- **Google Calendar API:** Automatisch meetings plannen
- **Bi-directional sync:** Calendar events → CRM interactions
- **Availability checking:** Show free/busy times
- **Zoom/Teams links:** Auto-generate video meeting links

**UI:**
```typescript
<CalendarIntegrationCard>
  <Button onClick={connectGoogleCalendar}>
    <GoogleIcon /> Connect Google Calendar
  </Button>
  {connected && (
    <div>
      <Badge>Syncing</Badge>
      <p>Last sync: 2 minuten geleden</p>
      <Button onClick={syncNow}>Sync Now</Button>
    </div>
  )}
</CalendarIntegrationCard>
```

#### 3. 💳 Payment Integration (Stripe/Mollie) (3 uur)

**Goal:** Accept quote payments direct in CRM

**Flow:**
```
1. Quote accepted → Generate payment link
2. Send payment link via email
3. Customer pays (Stripe/Mollie hosted page)
4. Webhook → Update quote status = 'paid'
5. Trigger project stage change: 'quote_signed' → 'in_development'
6. Send invoice email (PDF)
```

**Benefits:**
- Reduce payment friction
- Automatic invoice generation
- Payment status tracking
- Dunning for overdue payments

### Future Vision (Fase 3+)

#### 🌐 White-Label Multi-Tenant

- Deploy CRM for multiple agencies
- Custom branding per tenant
- Isolated databases per tenant
- Subscription billing (SaaS model)

#### 🔗 API voor Third-Party Integrations

```typescript
// RESTful API endpoints
GET    /api/v1/companies
POST   /api/v1/companies
GET    /api/v1/quotes/:id
POST   /api/v1/quotes/:id/send

// Webhook subscriptions
POST   /api/v1/webhooks
  └── events: ['quote.sent', 'deal.won', 'company.created']
```

#### 📱 Native Mobile App (React Native)

- iOS + Android apps
- Offline-first met sync
- Push notifications
- Mobile-optimized workflows

---

## 🚀 Getting Started

### Prerequisites

Zorg dat je de volgende tools hebt geïnstalleerd:

- **Node.js** 20.x of hoger ([Download](https://nodejs.org/))
- **npm** 10.x of hoger (komt met Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Supabase Account** ([Aanmaken](https://supabase.com/))
- **Code Editor** (VS Code aanbevolen)

### Installation (Lokale Development)

#### Stap 1: Clone Repository

```bash
git clone https://github.com/dirqsolutions/dirq-crm.git
cd dirq-crm
```

#### Stap 2: Install Dependencies

```bash
npm install
```

**Geïnstalleerde packages:**
- React 18.3 + React DOM
- TypeScript 5.x
- Vite (build tool)
- Tailwind CSS
- Supabase Client
- React Query (TanStack)
- React Hook Form + Zod
- shadcn/ui componenten
- Recharts (charts)
- React PDF Renderer
- Framer Motion (animations)
- En nog ~40 andere packages (zie `package.json`)

**Installatie duurt:** ~2-3 minuten (afhankelijk van internet snelheid)

#### Stap 3: Environment Variables Setup

Maak een `.env` bestand in de root van het project:

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Vul je Supabase credentials in:

```env
VITE_SUPABASE_URL=https://jouw-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Waar vind je deze credentials?**
1. Ga naar [Supabase Dashboard](https://app.supabase.com/)
2. Open je project
3. Ga naar **Settings** → **API**
4. Kopieer:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

#### Stap 4: Database Setup (Supabase)

**Optie A: Via Supabase Dashboard** (Aanbevolen voor beginners)

1. Ga naar je Supabase project dashboard
2. Open **SQL Editor** (icoon aan linkerkant)
3. Klik **New Query**
4. Kopieer en plak de migrations in deze volgorde:

   **Migration 1:** Core Schema
   ```sql
   -- Kopieer inhoud van: supabase/migrations/20260103_crm_core_schema.sql
   -- Dit creëert de basis tabellen (companies, contacts, leads, etc.)
   ```
   Klik **Run** → Wacht op "Success ✅"

   **Migration 2:** RLS Policies
   ```sql
   -- Kopieer inhoud van: supabase/migrations/20260103_crm_rls_policies.sql
   -- Dit beveiligt alle tabellen met role-based access control
   ```
   Klik **Run** → Wacht op "Success ✅"

   **Migration 3:** Role Transform
   ```sql
   -- Kopieer inhoud van: supabase/migrations/20260103_transform_roles_to_crm.sql
   -- Dit wijzigt de rollen naar CRM-specifieke rollen
   ```
   Klik **Run** → Wacht op "Success ✅"

   **Migration 4:** Website Sales CRM
   ```sql
   -- Kopieer inhoud van: supabase/migrations/20260103_website_sales_crm.sql
   -- Dit voegt quotes, projects en pipeline functionaliteit toe
   ```
   Klik **Run** → Wacht op "Success ✅"

   **Migration 5:** Notifications
   ```sql
   -- Kopieer inhoud van: supabase/migrations/20260106_notification_system.sql
   ```
   Klik **Run** → Wacht op "Success ✅"

   **Migration 6:** Storage (Avatars)
   ```sql
   -- Kopieer inhoud van: supabase/migrations/20260106_storage_avatars.sql
   ```
   Klik **Run** → Wacht op "Success ✅"

   **Migration 7:** Storage (Documents)
   ```sql
   -- Kopieer inhoud van: supabase/migrations/20260108_storage_documents.sql
   ```
   Klik **Run** → Wacht op "Success ✅"

   **Migration 8:** RLS Security Hardening (NEW - Jan 7, 2026)
   ```sql
   -- Kopieer inhoud van: supabase/migrations/20260107_rls_security_hardening_fixes.sql
   -- Dit fix SECURITY DEFINER functions met search_path protection
   ```
   Klik **Run** → Wacht op "Success ✅"

   **Migration 9:** Restore Dropped RLS Policies (NEW - Jan 7, 2026)
   ```sql
   -- Kopieer inhoud van: supabase/migrations/20260107_restore_dropped_policies.sql
   -- Dit herstelt companies & contacts RLS policies
   ```
   Klik **Run** → Wacht op "Success ✅"

**Optie B: Via Supabase CLI** (Voor gevorderde users)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref jouw-project-id

# Run alle migrations
supabase db push
```

#### Stap 5: Seed Data (Optioneel)

Voor development kun je test data toevoegen:

```sql
-- Ga naar SQL Editor in Supabase Dashboard
-- Voer uit: supabase/seed.sql (indien beschikbaar)
```

Dit creëert:
- 10 dummy bedrijven
- 25 contactpersonen
- 15 projects in verschillende stages
- 8 quotes (mix van sent, accepted, declined)

#### Stap 6: Start Development Server

```bash
npm run dev
```

**Output:**
```
VITE v5.x.x  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
➜  press h + enter to show help
```

Open [http://localhost:5173](http://localhost:5173) in je browser!

#### Stap 7: Create First User

1. Ga naar `/auth` (login pagina)
2. Klik "Sign Up"
3. Vul in:
   - Email: `admin@dirqsolutions.nl`
   - Wachtwoord: minimaal 8 karakters
4. Check je email voor verificatie link
5. Klik verificatie link → Je wordt ingelogd

**Default Role:** Nieuwe users krijgen automatisch `SALES` role.

**Maak jezelf ADMIN:**
```sql
-- Ga naar SQL Editor in Supabase
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'admin@dirqsolutions.nl';
```

Nu heb je volledige toegang tot alle features!

---

### 🤖 AI Webhook Handler Setup (Optioneel)

Voor externe AI-integraties (n8n, Manus AI):

#### Stap 1: Deploy Edge Function

**Windows:**
```powershell
cd "c:\Dirq apps\dirq-solutions-crmwebsite"
.\supabase\functions\api-webhook-handler\deploy.ps1
```

**Linux/Mac:**
```bash
cd /path/to/dirq-solutions-crmwebsite
chmod +x supabase/functions/api-webhook-handler/deploy.sh
./supabase/functions/api-webhook-handler/deploy.sh
```

**Script output:**
```
🚀 Deploying AI Webhook Handler Edge Function...
🔑 Generating secure API key...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 YOUR WEBHOOK API KEY (SAVE THIS!):
   [64-character-hex-string]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Edge Function deployed
✅ Test successful!
```

**⚠️ BELANGRIJK:** Sla de API key veilig op!

#### Stap 2: Configureer n8n (Optioneel)

1. Open n8n workflow editor
2. Voeg **HTTP Request** node toe
3. URL: `https://[project-ref].supabase.co/functions/v1/api-webhook-handler`
4. Headers: `X-API-Key: [your-api-key]`
5. Import workflow templates van: `supabase/functions/api-webhook-handler/N8N_TEMPLATES.md`

**Beschikbare templates:**
- Contact Form → CRM Lead
- LinkedIn Inbound → CRM Lead
- Calendar Booking → Lead + Task
- HubSpot → Supabase Sync

#### Stap 3: Configureer Manus AI (Optioneel)

Zie: `supabase/functions/api-webhook-handler/README.md`

**Complete documentatie:**
- API guide: `README.md` (850+ lines)
- n8n templates: `N8N_TEMPLATES.md` (550+ lines)
- Quick reference: `QUICK_REFERENCE.md` (250+ lines)
- Test suite: `test.ts` (400+ lines)

---

### Beschikbare Scripts

```bash
# Development server (met hot reload)
npm run dev

# TypeScript type checking
npm run type-check

# Linting (code quality check)
npm run lint

# Run tests
npm test

# Test coverage report
npm run test:coverage

# Build for production
npm run build

# Preview production build lokaal
npm run preview
```

### Project Structure Overzicht

```
dirq-crm/
├── src/                          # Source code
│   ├── features/                 # Feature modules (companies, contacts, etc.)
│   ├── components/               # Reusable UI components
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities & helpers
│   ├── types/                    # TypeScript types
│   ├── pages/                    # Page components
│   └── main.tsx                  # Entry point
│
├── supabase/                     # Database
│   ├── migrations/               # SQL migrations
│   └── config.toml               # Supabase config
│
├── public/                       # Static assets
├── .env                          # Environment variables (NIET committen!)
├── package.json                  # Dependencies
├── vite.config.ts                # Vite configuration
├── tailwind.config.ts            # Tailwind CSS config
└── tsconfig.json                 # TypeScript config
```

### Troubleshooting

#### ❌ "Supabase client error: Invalid API key"

**Oplossing:**
- Check of `.env` bestand correct is ingevuld
- Verifieer dat je de **anon public** key hebt (NIET de service_role key!)
- Herstart development server (`Ctrl+C` → `npm run dev`)

#### ❌ "Database error: relation does not exist"

**Oplossing:**
- Migrations zijn niet correct uitgevoerd
- Ga naar Supabase Dashboard → SQL Editor
- Run migrations opnieuw in de juiste volgorde

#### ❌ "Module not found" errors

**Oplossing:**
```bash
# Delete node_modules en reinstall
rm -rf node_modules
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

#### ❌ Port 5173 is already in use

**Oplossing:**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5173 | xargs kill -9

# Of gebruik andere port
npm run dev -- --port 5174
```

---

## 🛠️ Development Workflow

### Code Style & Conventions

**TypeScript Strict Mode:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Naming Conventions:**
- Components: PascalCase (`CompanyCard.tsx`)
- Hooks: camelCase met `use` prefix (`useCompanies.ts`)
- Types/Interfaces: PascalCase (`Company`, `ProjectStage`)
- Utilities: camelCase (`formatCurrency.ts`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)

**Import Order:**
```typescript
// 1. External libraries
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal utilities
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';

// 3. Types
import type { Company, Contact } from '@/types/crm';

// 4. Components
import { Button } from '@/components/ui/button';
import { CompanyCard } from './components/CompanyCard';
```

### Git Workflow

**Branch Strategy:**
```
main          ← Production-ready code
  ↑
develop       ← Integration branch
  ↑
feature/*     ← Feature branches
bugfix/*      ← Bug fixes
hotfix/*      ← Critical production fixes
```

**Commit Message Format:**
```
feat: Add CSV export to companies page
fix: Resolve quote PDF generation bug
docs: Update README with installation steps
refactor: Extract formatCurrency to utils
test: Add unit tests for useCompanies hook
chore: Update dependencies
```

**Pull Request Template:**
```markdown
## Beschrijving
Wat doet deze PR?

## Type Change
- [ ] Feature (nieuwe functionaliteit)
- [ ] Bug fix (oplossing voor issue)
- [ ] Breaking change (backwards incompatible)

## Testing
Hoe is dit getest?

## Screenshots
Voor UI changes: voeg screenshots toe
```

### Testing Strategy

**Unit Tests** (React Testing Library):
```typescript
// src/features/companies/CompanyCard.test.tsx
import { render, screen } from '@testing-library/react';
import { CompanyCard } from './CompanyCard';

describe('CompanyCard', () => {
  it('renders company name', () => {
    const company = { name: 'Acme Corp', status: 'customer' };
    render(<CompanyCard company={company} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });
});
```

**Run tests:**
```bash
npm test                    # Run all tests
npm run test:coverage       # Generate coverage report
npm run test:ui             # Open Vitest UI
```

### Database Migrations

**Creating a New Migration:**

1. Create SQL file in `supabase/migrations/`:
   ```
   20260107_add_company_notes.sql
   ```

2. Write migration SQL:
   ```sql
   -- Add notes column to companies table
   ALTER TABLE companies ADD COLUMN notes TEXT;
   
   -- Create index for full-text search
   CREATE INDEX idx_companies_notes ON companies USING gin(to_tsvector('english', notes));
   ```

3. Test locally eerst!
4. Commit migration file
5. Deploy: Run in Supabase Dashboard SQL Editor

**Migration Best Practices:**
- ✅ Altijd backwards compatible
- ✅ Test met productie-achtige data volume
- ✅ Include rollback plan in comments
- ❌ Nooit direct wijzigen in productie database

---

## 🚢 Deployment

### Netlify Deployment (Aanbevolen)

**Stap 1: Connect Repository**

1. Ga naar [Netlify Dashboard](https://app.netlify.com/)
2. Klik "Add new site" → "Import an existing project"
3. Selecteer Git provider (GitHub/GitLab)
4. Kies `dirq-crm` repository
5. Configure build settings:
   ```
   Build command:    npm run build
   Publish directory: dist
   ```

**Stap 2: Environment Variables**

Voeg toe in **Site settings** → **Environment variables**:
```
VITE_SUPABASE_URL = https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGc...
```

**Stap 3: Deploy**

Klik "Deploy site" → Wacht ~2 minuten → Live! 🎉

**Auto-Deploy:**
- Elke push naar `main` triggert nieuwe deploy

---

### 🤖 AI Webhook Handler Deployment

**Edge Functions worden apart gedeployed:**

```bash
# Install Supabase CLI (eenmalig)
npm install -g supabase

# Login to Supabase
supabase login

# Link je project
supabase link --project-ref [jouw-project-ref]

# Deploy AI webhook handler
supabase functions deploy api-webhook-handler

# Set API key secret
supabase secrets set WEBHOOK_API_KEY=[generated-key]
```

**Of gebruik de automated scripts:**

**Windows:**
```powershell
.\supabase\functions\api-webhook-handler\deploy.ps1
```

**Linux/Mac:**
```bash
chmod +x supabase/functions/api-webhook-handler/deploy.sh
./supabase/functions/api-webhook-handler/deploy.sh
```

**Post-deployment:**
1. Save API key securely (password manager)
2. Configure n8n workflows met API key
3. Configure Manus AI HTTP actions
4. Monitor logs: `supabase functions logs api-webhook-handler --follow`

**Documentatie:**
- Complete guide: `supabase/functions/api-webhook-handler/README.md`
- n8n templates: `supabase/functions/api-webhook-handler/N8N_TEMPLATES.md`

---
- Preview deploys voor pull requests

**Custom Domain:**
```
Site settings → Domain management → Add custom domain
└── dirq-crm.nl (voorbeeld)
    └── SSL automatisch via Let's Encrypt
```

### Vercel Deployment (Alternatief)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Production deploy
vercel --prod
```

**Environment Variables:** Voeg toe via Vercel Dashboard

### Performance Optimization Checklist

✅ **Code Splitting:**
- Lazy load routes ✅
- Dynamic imports voor large libraries ✅
- Chunk splitting configured in Vite ✅

✅ **Asset Optimization:**
- Images: WebP format + lazy loading
- Fonts: Preload critical fonts
- CSS: Purge unused Tailwind classes ✅

✅ **Caching:**
- React Query caching ✅ (5-10 min staleTime)
- Service worker voor offline support (future)
- CDN caching voor static assets ✅ (Netlify/Vercel)

✅ **Monitoring:**
- Sentry voor error tracking ✅ (geïnstalleerd)
- Lighthouse CI voor performance tracking
- Real user monitoring (RUM)

---

## 📚 Additional Resources

### Documentation

- **Supabase Setup Guide:** [SUPABASE_SETUP_GUIDE.md](SUPABASE_SETUP_GUIDE.md)
- **CRM Transformation Progress:** [CRM_TRANSFORMATION_PROGRESS.md](CRM_TRANSFORMATION_PROGRESS.md)
- **Code Audit Report:** [CRM_CODE_AUDIT.md](CRM_CODE_AUDIT.md)
- **Product Audit:** [CRM_PRODUCT_AUDIT.md](CRM_PRODUCT_AUDIT.md)
- **Design System:** [APP_DESIGN_SYSTEM_OVERZICHT.md](APP_DESIGN_SYSTEM_OVERZICHT.md)
- **Contributing Guide:** [CONTRIBUTING.md](CONTRIBUTING.md)

### Tech Stack Documentation

- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Community & Support

- **Issues:** [GitHub Issues](https://github.com/dirqsolutions/dirq-crm/issues)
- **Discussions:** [GitHub Discussions](https://github.com/dirqsolutions/dirq-crm/discussions)
- **Email:** support@dirqsolutions.nl

---

## 📝 License

**Proprietary License** - Dirq Solutions

Dit is gesloten software eigendom van Dirq Solutions. Ongeautoriseerd gebruik, kopiëren, of distributie is verboden.

Voor licentievragen: legal@dirqsolutions.nl

---

## 👥 Team

**Ontwikkeld door Dirq Solutions**

- **Website:** [dirqsolutions.nl](https://dirqsolutions.nl)
- **Email:** info@dirqsolutions.nl
- **LinkedIn:** [Dirq Solutions](https://linkedin.com/company/dirq-solutions)

---

## 🎉 Acknowledgments

Special thanks to:
- **Supabase** voor de excellent database & auth platform
- **shadcn** voor de beautiful component library
- **TanStack** voor React Query
- **Vercel** voor Vite en Next.js inspiration
- **Open Source Community** voor de tools die dit mogelijk maken

---

<div align="center">

**Built with ❤️ for modern web development agencies**

[⬆ Back to Top](#-dirq-solutions-crm)

</div>

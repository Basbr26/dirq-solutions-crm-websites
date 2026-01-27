# 🏗️ System Architecture - Dirq Solutions CRM

> **Complete Technical Blueprint**  
> **Last Updated:** 27 Januari 2026  
> **Version:** 2.1.0  
> **Architecture Type:** Enterprise-Grade SaaS CRM

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Architecture](#database-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Authentication & Security](#authentication--security)
7. [Integration Architecture](#integration-architecture)
8. [UI/UX Design System](#uiux-design-system)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Deployment Architecture](#deployment-architecture)
11. [Feature Map](#feature-map)

---

## 🎯 System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  React 18 SPA + TypeScript + Vite + TanStack Query         │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS/WSS
┌─────────────────────────────────────────────────────────────┐
│                    CDN & EDGE LAYER                         │
│  Netlify CDN + Edge Functions (Deno Runtime)                │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND LAYER                             │
│  Supabase (PostgreSQL 15 + Auth + Storage + Realtime)      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                 INTEGRATION LAYER                           │
│  n8n · Google Calendar · Resend · KVK API · Gemini AI      │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

- **Mobile-First Design** - Progressive enhancement van mobile naar desktop
- **Offline-First** - React Query caching voor offline capabilities
- **Real-time by Default** - Supabase Realtime subscriptions
- **Type-Safe** - End-to-end TypeScript met strict mode
- **Security by Default** - Row Level Security op alle tabellen
- **Performance First** - Code splitting, lazy loading, optimistic updates

---

## 🛠️ Technology Stack

### Frontend Stack

```typescript
{
  "framework": "React 18.3",
  "language": "TypeScript 5.7",
  "buildTool": "Vite 6",
  "stateManagement": "TanStack Query v5",
  "routing": "React Router v6",
  "styling": {
    "framework": "Tailwind CSS",
    "components": "shadcn/ui",
    "animations": "Framer Motion"
  },
  "forms": "React Hook Form + Zod",
  "i18n": "react-i18next",
  "charts": "Recharts",
  "calendar": "react-big-calendar",
  "pdf": "@react-pdf/renderer",
  "dates": "date-fns"
}
```

### Backend Stack

```typescript
{
  "database": "PostgreSQL 15 (Supabase)",
  "auth": "Supabase Auth (JWT + OAuth2.0)",
  "storage": "Supabase Storage (S3-compatible)",
  "realtime": "Supabase Realtime (WebSockets)",
  "functions": "Deno Edge Functions",
  "rls": "Row Level Security Policies",
  "encryption": "pgcrypto (AES-256)"
}
```

### Integration Stack

```typescript
{
  "automation": "n8n Cloud",
  "email": "Resend API",
  "calendar": "Google Calendar API",
  "ai": "Google Gemini API",
  "data": "KVK API (Dutch Chamber of Commerce)",
  "monitoring": "Sentry",
  "analytics": "Custom Dashboard"
}
```

---

## 🗄️ Database Architecture

### Entity Relationship Diagram (ERD)

```
                    ┌──────────────┐
                    │   profiles   │ (Supabase Auth Users)
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ↓              ↓              ↓
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  companies   │  │   contacts   │  │   projects   │
    │              │  │              │  │   (leads)    │
    │ - name       │  │ - full_name  │  │ - title      │
    │ - kvk        │  │ - email      │  │ - stage      │
    │ - industry   │  │ - phone      │  │ - value      │
    │ - owner_id──>│  │ - company_id>│  │ - company_id>│
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                  │
           └─────────┬───────┴──────────────────┘
                     │
                     ↓
            ┌──────────────────┐
            │  interactions    │
            │  - type          │
            │  - notes         │
            │  - company_id───>│
            │  - contact_id───>│
            │  - lead_id──────>│
            │  - user_id──────>│
            └──────────────────┘
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
  ┌───────────┐ ┌───────────┐ ┌───────────┐
  │  quotes   │ │   tasks   │ │ calendar  │
  │ - number  │ │ - title   │ │ _events   │
  │ - total   │ │ - due     │ │ - start   │
  │ - status  │ │ - status  │ │ - end     │
  └───────┬───┘ └───────────┘ └───────────┘
          │
          ↓
  ┌───────────────┐
  │ quote_items   │
  │ - description │
  │ - quantity    │
  │ - unit_price  │
  └───────────────┘
```

### Core Tables

#### 1. **profiles** (extends auth.users)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  voornaam TEXT,
  achternaam TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('ADMIN', 'SALES', 'MANAGER', 'SUPPORT')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** User management en authentication  
**Key Fields:** role (determines permissions), avatar_url  
**Relations:** Referenced by all user_id foreign keys  
**RLS:** Users can read their own profile, admins can read all

#### 2. **companies**
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kvk_nummer TEXT UNIQUE,
  website TEXT,
  industry_id UUID REFERENCES industries(id),
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Nederland',
  owner_id UUID REFERENCES profiles(id),
  logo_url TEXT,
  enrichment_data JSONB, -- KVK + external data
  mrr DECIMAL(10,2) DEFAULT 0, -- Monthly Recurring Revenue
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_industry ON companies(industry_id);
CREATE INDEX idx_companies_kvk ON companies(kvk_nummer);
```

**Purpose:** Central company/customer database  
**Key Features:**  
- KVK integration for Dutch companies
- MRR tracking via database triggers
- Owner assignment for access control
- Enrichment data from external APIs

**Triggers:**
- `update_company_updated_at` - Auto-update timestamp
- `update_company_mrr` - Calculate MRR from active subscriptions

#### 3. **contacts**
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  voornaam TEXT,
  achternaam TEXT,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  position TEXT,
  department TEXT,
  linkedin_url TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_primary ON contacts(company_id, is_primary) 
  WHERE is_primary = TRUE;
```

**Purpose:** Contact person management  
**Key Features:**  
- Multiple contacts per company
- Primary contact designation
- LinkedIn integration ready

#### 4. **projects** (formerly leads)
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  stage TEXT NOT NULL CHECK (stage IN (
    'lead', 'qualified', 'quote_sent', 'quote_signed',
    'quote_accepted', 'in_development', 'in_review',
    'live', 'maintenance', 'closed_lost'
  )),
  value DECIMAL(10,2),
  expected_close_date DATE,
  actual_close_date DATE,
  probability INTEGER CHECK (probability BETWEEN 0 AND 100),
  
  -- Website specifics
  website_type TEXT, -- 'starter', 'business', 'enterprise'
  hosting_type TEXT,
  num_pages INTEGER DEFAULT 1,
  
  -- Finance tracking
  monthly_revenue DECIMAL(10,2),
  billing_frequency TEXT, -- 'monthly', 'quarterly', 'yearly'
  
  -- Assignment & tracking
  owner_id UUID REFERENCES profiles(id),
  source TEXT, -- 'website', 'referral', 'linkedin', etc.
  lead_score INTEGER DEFAULT 0, -- 0-100 (n8n calculated)
  
  -- Metadata
  notes TEXT,
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_date TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_close_date ON projects(expected_close_date);
```

**Purpose:** Sales pipeline & project tracking  
**Key Features:**  
- 10-stage sales funnel (lead → live)
- Website-specific fields (pages, hosting, type)
- Revenue tracking per project
- Lead scoring (AI-powered via n8n)
- Source attribution

**Triggers:**
- `update_projects_updated_at` - Auto-update timestamp
- `set_last_contact_date` - Update from interactions
- `update_project_stage_from_quote` - Auto-sync with quote status

#### 5. **interactions**
```sql
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- FK to projects table!
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  
  type TEXT NOT NULL CHECK (type IN (
    'call', 'email', 'meeting', 'note', 
    'linkedin_message', 'linkedin_video',
    'physical_mail', 'demo', 'presentation'
  )),
  
  subject TEXT,
  notes TEXT,
  outcome TEXT,
  next_steps TEXT,
  
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_interactions_company ON interactions(company_id);
CREATE INDEX idx_interactions_lead ON interactions(lead_id);
CREATE INDEX idx_interactions_user ON interactions(user_id);
CREATE INDEX idx_interactions_date ON interactions(created_at DESC);
```

**Purpose:** Activity tracking & outreach logging  
**Key Features:**  
- Multi-type interactions (call, email, LinkedIn, etc.)
- Links to company, contact, project, quote
- Scheduled vs completed tracking
- Outcome & next steps documentation

#### 6. **quotes**
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_percentage DECIMAL(5,2) DEFAULT 21.00,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'accepted', 
    'rejected', 'expired', 'signed'
  )),
  
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejected_reason TEXT,
  
  -- E-signature tracking
  sign_token TEXT UNIQUE,
  sign_token_expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signed_by_name TEXT,
  signed_by_email TEXT,
  signed_by_ip INET,
  signature_data TEXT, -- Base64 canvas signature
  
  -- Provider signature (dual signature support)
  provider_signed_at TIMESTAMPTZ,
  provider_signed_by UUID REFERENCES profiles(id),
  provider_signature_data TEXT,
  
  created_by UUID REFERENCES profiles(id),
  owner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quotes_company ON quotes(company_id);
CREATE INDEX idx_quotes_project ON quotes(project_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_number ON quotes(quote_number);
CREATE UNIQUE INDEX idx_quotes_sign_token ON quotes(sign_token) 
  WHERE sign_token IS NOT NULL;
```

**Purpose:** Quote generation & e-signature  
**Key Features:**  
- PDF generation with VAT calculations
- Multi-status workflow (draft → signed)
- Secure e-signature tokens (expiring)
- Dual signature support (client + provider)
- IP tracking for legal validity
- Auto-sync with project stage

**Triggers:**
- `generate_quote_number` - Auto-increment quote numbers
- `calculate_quote_totals` - Auto-calculate subtotal/VAT/total
- `update_project_on_quote_change` - Sync project stage

#### 7. **quote_items**
```sql
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INTEGER DEFAULT 0,
  category TEXT, -- 'website', 'hosting', 'maintenance', 'custom'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id, sort_order);
```

**Purpose:** Line items for quotes  
**Key Features:**  
- Calculated total (quantity × unit_price)
- Sortable items
- Category grouping

#### 8. **calendar_events**
```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  
  -- Relations
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
  
  -- Google Calendar sync
  google_event_id TEXT UNIQUE,
  google_calendar_id TEXT,
  last_synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_google ON calendar_events(google_event_id);
```

**Purpose:** Calendar & Google Calendar sync  
**Key Features:**  
- Bi-directional Google Calendar sync
- Links to CRM entities (company, contact, project)
- Webhook-based real-time updates

#### 9. **tasks**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  -- Relations
  assigned_to UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE status != 'completed';
CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
```

**Purpose:** Task management  
**Key Features:**  
- Priority & status tracking
- Assignment to users
- Links to projects & companies
- Calendar integration

### Supporting Tables

#### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) 
  WHERE read_at IS NULL;
```

#### documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### email_logs
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  recipient TEXT NOT NULL,
  subject TEXT,
  provider TEXT DEFAULT 'resend',
  external_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### subscriptions
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  mrr DECIMAL(10,2) NOT NULL,
  billing_frequency TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Functions & Triggers

#### Auto-update timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to: companies, contacts, projects, quotes, tasks
```

#### MRR Calculation
```sql
CREATE OR REPLACE FUNCTION calculate_company_mrr()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE companies
  SET mrr = (
    SELECT COALESCE(SUM(mrr), 0)
    FROM subscriptions
    WHERE company_id = NEW.company_id
      AND status = 'active'
  )
  WHERE id = NEW.company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Quote Number Generation
```sql
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  next_num INTEGER;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM quotes
  WHERE quote_number LIKE year_prefix || '%';
  
  NEW.quote_number := year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 Frontend Architecture

### Component Structure

```
src/
├── components/               # Shared components
│   ├── ui/                  # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── sheet.tsx
│   │   ├── tabs.tsx
│   │   └── [30+ components]
│   │
│   ├── layout/              # Layout components
│   │   ├── AppLayout.tsx          # Main layout wrapper
│   │   ├── AppSidebar.tsx         # Desktop sidebar navigation
│   │   ├── AppHeader.tsx          # Top header with user menu
│   │   └── QuickActionSheet.tsx   # Mobile quick actions
│   │
│   ├── DashboardHeader.tsx        # Legacy header (being phased out)
│   ├── MobileBottomNav.tsx        # Mobile bottom navigation
│   ├── NotificationBell.tsx       # Real-time notifications
│   ├── ThemeToggle.tsx            # Dark/light mode switcher
│   ├── LanguageSwitcher.tsx       # i18n language selector
│   ├── CommandBar.tsx             # Cmd+K command palette
│   ├── PullToRefresh.tsx          # Mobile pull-to-refresh
│   ├── ActivityLog.tsx            # Interaction timeline
│   ├── UserManagement.tsx         # Admin user CRUD
│   └── [100+ components]
│
├── features/                # Feature modules (Domain-Driven Design)
│   ├── companies/
│   │   ├── CompaniesPage.tsx
│   │   ├── CompanyDetailPage.tsx
│   │   ├── components/
│   │   │   ├── CompanyForm.tsx
│   │   │   ├── CompanyCard.tsx
│   │   │   ├── CompanyKVKSearch.tsx
│   │   │   └── CompanySubscriptions.tsx
│   │   └── hooks/
│   │       ├── useCompanies.ts
│   │       └── useCompanyMRR.ts
│   │
│   ├── contacts/
│   │   ├── ContactsPage.tsx
│   │   ├── ContactDetailPage.tsx
│   │   ├── components/
│   │   │   ├── ContactForm.tsx
│   │   │   ├── ContactCard.tsx
│   │   │   └── ContactSelector.tsx
│   │   └── hooks/
│   │       └── useContacts.ts
│   │
│   ├── projects/
│   │   ├── ProjectsPage.tsx
│   │   ├── PipelinePage.tsx          # Kanban board
│   │   ├── ProjectDetailPage.tsx
│   │   ├── components/
│   │   │   ├── ProjectForm.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   └── ProjectStageIndicator.tsx
│   │   └── hooks/
│   │       ├── useProjects.ts
│   │       └── usePipelineStats.ts
│   │
│   ├── quotes/
│   │   ├── QuotesPage.tsx
│   │   ├── QuoteDetailPage.tsx
│   │   ├── components/
│   │   │   ├── QuoteForm.tsx
│   │   │   ├── QuoteItemsTable.tsx
│   │   │   ├── QuotePDFPreview.tsx
│   │   │   ├── QuoteStatusBadge.tsx
│   │   │   ├── SignaturePad.tsx
│   │   │   └── DualSignatureDisplay.tsx
│   │   └── hooks/
│   │       ├── useQuotes.ts
│   │       └── useQuoteStats.ts
│   │
│   └── interactions/
│       ├── InteractionsPage.tsx
│       ├── components/
│       │   ├── InteractionForm.tsx
│       │   ├── InteractionTimeline.tsx
│       │   └── InteractionTypeSelector.tsx
│       └── hooks/
│           └── useInteractions.ts
│
├── pages/                   # Route pages
│   ├── DashboardSuperAdmin.tsx
│   ├── DashboardExecutive.tsx
│   ├── DashboardCRM.tsx
│   ├── CalendarPage.tsx
│   ├── EmailDraftsPage.tsx
│   ├── WorkflowTemplatesPage.tsx
│   ├── DocumentTemplatesPage.tsx
│   ├── SettingsPage.tsx
│   ├── AIChatPage.tsx
│   ├── PublicSignQuotePage.tsx      # Public e-sign page
│   └── NotFound.tsx
│
├── hooks/                   # Custom hooks
│   ├── useAuth.ts                   # Authentication hook
│   ├── useMediaQuery.ts             # Responsive breakpoints
│   ├── useDebounce.ts               # Debounce utility
│   ├── useLocalStorage.ts           # localStorage wrapper
│   └── use-toast.ts                 # Toast notifications
│
├── lib/                     # Utilities & config
│   ├── supabase/
│   │   └── client.ts                # Supabase client
│   ├── i18n.ts                      # i18n configuration
│   ├── i18n-utils.ts                # Date/currency formatters
│   ├── locales/
│   │   ├── nl/translation.json      # Dutch (560+ keys)
│   │   └── en/translation.json      # English (560+ keys)
│   ├── utils.ts                     # cn() helper
│   ├── validation-messages.ts       # Zod Dutch messages
│   ├── activityLogger.ts            # Audit logging
│   └── sentry.ts                    # Error monitoring
│
├── types/                   # TypeScript types
│   ├── database.types.ts            # Auto-generated from Supabase
│   ├── projects.ts                  # Project/Lead types
│   ├── companies.ts                 # Company types
│   ├── quotes.ts                    # Quote types
│   └── supabase.ts                  # Supabase helper types
│
└── App.tsx                  # Root component + routing
```

### Routing Structure

```typescript
// Public routes (no auth)
/auth                    → AuthPage (login/register)
/sign-quote/:token       → PublicSignQuotePage (e-signature)

// Role-based dashboards
/                        → RoleBasedRedirect
/dashboard/super-admin   → DashboardSuperAdmin (ADMIN only)
/dashboard/executive     → DashboardExecutive (ADMIN only)
/dashboard/crm           → DashboardCRM (SALES, MANAGER)

// CRM Routes (role-filtered)
/companies               → CompaniesPage
/companies/:id           → CompanyDetailPage
/contacts                → ContactsPage
/contacts/:id            → ContactDetailPage
/projects                → ProjectsPage (list view)
/pipeline                → PipelinePage (kanban)
/projects/:id            → ProjectDetailPage
/quotes                  → QuotesPage
/quotes/:id              → QuoteDetailPage
/interactions            → InteractionsPage
/calendar                → CalendarPage

// Automation & Tools
/workflows/templates     → WorkflowTemplatesPage (n8n)
/workflows/:id           → WorkflowBuilder
/email-drafts            → EmailDraftsPage (AI drafts)
/documents/templates     → DocumentTemplatesPage
/ai-chat                 → AIChatPage (Gemini chat)

// Admin Routes (ADMIN only)
/settings                → SettingsPage
/admin/gebruikers        → GebruikersbeheerPage

// 404 fallback
/*                       → NotFound
```

### State Management Pattern

**TanStack Query (React Query) - Server State**
```typescript
// Example: useProjects hook
export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          companies(id, name, logo_url),
          contacts(id, voornaam, achternaam),
          profiles(voornaam, achternaam)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.stage) query = query.eq('stage', filters.stage);
      if (filters?.owner_id) query = query.eq('owner_id', filters.owner_id);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000,   // 5 minutes
  });
}

// Usage in components
const { data: projects, isLoading, error } = useProjects({ stage: 'lead' });
```

**Local State - useState/useReducer**
```typescript
// Form state, UI toggles, temporary data
const [isOpen, setIsOpen] = useState(false);
const [selectedItems, setSelectedItems] = useState<string[]>([]);
```

**Global State - Context + localStorage**
```typescript
// Auth context
export function useAuth() {
  const { session, profile, role } = useContext(AuthContext);
  return { user: session?.user, profile, role, signOut };
}

// Theme context (dark/light)
const { theme, setTheme } = useTheme();

// i18n context
const { t, i18n } = useTranslation();
```

### Component Patterns

#### 1. **Feature Module Pattern**
Each feature (companies, projects, quotes) is self-contained:
```
features/companies/
├── CompaniesPage.tsx        # List view
├── CompanyDetailPage.tsx    # Detail view
├── components/              # Feature-specific components
│   ├── CompanyForm.tsx
│   ├── CompanyCard.tsx
│   └── CompanySubscriptions.tsx
└── hooks/                   # Feature-specific hooks
    ├── useCompanies.ts      # Data fetching
    └── useCompanyMRR.ts     # Business logic
```

#### 2. **Layout Composition Pattern**
```tsx
<AppLayout title="Companies" actions={<CreateButton />}>
  <CompaniesPage />
</AppLayout>

// Desktop: Sidebar + Header + Content
// Mobile: BottomNav + Header + Content
```

#### 3. **Role-Based Rendering**
```tsx
const { role } = useAuth();

{(role === 'ADMIN' || role === 'SALES') && (
  <Button onClick={createQuote}>Offerte Aanmaken</Button>
)}
```

#### 4. **Optimistic Updates**
```tsx
const updateMutation = useMutation({
  mutationFn: updateProject,
  onMutate: async (newData) => {
    // Optimistically update UI
    await queryClient.cancelQueries({ queryKey: ['projects'] });
    const prev = queryClient.getQueryData(['projects']);
    queryClient.setQueryData(['projects'], (old) => 
      old.map(p => p.id === newData.id ? { ...p, ...newData } : p)
    );
    return { prev };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['projects'], context.prev);
  },
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  },
});
```

---

## 🔐 Authentication & Security

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User visits /auth                                        │
│    → Email/Password input                                   │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Supabase Auth validates credentials                      │
│    → JWT token generated                                    │
│    → Session stored in localStorage                         │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Profile lookup (profiles table)                          │
│    → Fetch user role (ADMIN, SALES, MANAGER, SUPPORT)      │
│    → Store in AuthContext                                   │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Role-based redirect                                      │
│    → ADMIN: /dashboard/executive                            │
│    → SALES/MANAGER: /dashboard/crm                          │
│    → SUPPORT: /companies                                    │
└─────────────────────────────────────────────────────────────┘
```

### Row Level Security (RLS) Policies

**Example: Companies Table**
```sql
-- SELECT: Users can read companies they own or all if admin
CREATE POLICY "users_read_own_companies" ON companies
FOR SELECT USING (
  auth.uid() = owner_id 
  OR is_admin(auth.uid())
);

-- INSERT: Authenticated users can create
CREATE POLICY "authenticated_create_companies" ON companies
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Only owner or admin can update
CREATE POLICY "users_update_own_companies" ON companies
FOR UPDATE USING (
  auth.uid() = owner_id 
  OR is_admin(auth.uid())
);

-- DELETE: Only admin can delete
CREATE POLICY "admin_delete_companies" ON companies
FOR DELETE USING (is_admin(auth.uid()));
```

**Helper Function: is_admin**
```sql
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role IN ('ADMIN', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Security Features

1. **JWT-based Authentication**
   - Tokens auto-refresh before expiry
   - Secure httpOnly cookies (production)
   - localStorage fallback (development)

2. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Policies enforce data isolation
   - Admin bypass for full access

3. **API Rate Limiting**
   - Edge functions: 100 req/min per IP
   - Database: Connection pooling
   - `rate_limit_requests` table tracks usage

4. **Data Encryption**
   - OAuth tokens encrypted (AES-256)
   - Passwords hashed (bcrypt)
   - E-sign tokens: SHA-256 + expiry

5. **Audit Logging**
   - `crm_audit_log` table
   - Tracks all CRUD operations
   - IP address + user agent logging

6. **CORS & CSP**
   - Strict CORS policies
   - Content Security Policy headers
   - XSS protection enabled

---

## 🔌 Integration Architecture

### 1. Google Calendar Integration

**Architecture:**
```
CRM Event Created/Updated
       ↓
[calendar_events table]
       ↓
[Supabase Trigger]
       ↓
[Edge Function: sync-to-google]
       ↓
[Google Calendar API]
       ↓
Event synced to Google Calendar
       ↓
[Webhook notification]
       ↓
[Edge Function: google-calendar-webhook]
       ↓
[Realtime subscription updates UI]
```

**Key Files:**
- `supabase/functions/sync-to-google/` - Push events to Google
- `supabase/functions/google-calendar-webhook/` - Receive Google updates
- `src/components/calendar/GoogleCalendarSync.tsx` - UI component
- `src/pages/CalendarPage.tsx` - Calendar view

**Features:**
- Bi-directional sync (CRM ↔ Google)
- Real-time updates via webhooks
- OAuth 2.0 with refresh tokens
- Encrypted token storage (pgcrypto)
- Auto-renewal of webhook subscriptions

### 2. n8n Automation Integration

**Workflow Categories:**
```
📊 Daily Automation
├── Pipeline health checks
├── Stale lead alerts
├── Task reminders
└── Quote expiration notifications

🤖 AI-Powered
├── Quote generation (Gemini)
├── Lead scoring (0-100)
├── Email draft generation
└── Company enrichment (KVK + logos)

💰 Revenue Tracking
├── MRR calculations
├── Churn prevention
├── Payment reminders
└── Revenue forecasting

🚀 Lifecycle Automation
├── Project onboarding (7 tasks)
├── Website launch sequence
├── Win/loss processing
└── NPS survey triggers
```

**Webhook Endpoints:**
- `/webhook/crm-to-calendar` - Calendar sync
- `/webhook/project-won` - Onboarding trigger
- `/webhook/generate-quote` - AI quote builder
- `/webhook/company-created` - Enrichment trigger
- `/webhook/calculate-lead-score` - Score update

### 3. Email Integration (Resend)

**Use Cases:**
- Quote sending (PDF attachment)
- E-signature invitations
- Password reset emails
- Notification emails
- AI-generated email drafts

**Edge Function:**
```typescript
// supabase/functions/send-sign-email/index.ts
export async function sendSignEmail(data: EmailRequest) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Dirq Solutions <bas@dirqsolutions.nl>',
      to: [data.to],
      subject: `Document ter ondertekening: ${data.documentTitle}`,
      html: emailHtml,
    }),
  });
  
  // Log to email_logs table
  await supabase.from('email_logs').insert({ ... });
}
```

### 4. KVK API Integration

**Purpose:** Dutch Chamber of Commerce data enrichment

**Flow:**
```
User enters KVK number
       ↓
[CompanyForm validation]
       ↓
[n8n webhook: company-created]
       ↓
[KVK API lookup]
       ↓
[Enrichment data stored in JSONB]
       ↓
Company profile auto-filled
```

**Enriched Data:**
- Legal company name
- Address & city
- Industry classification
- Registration date
- Company status

### 5. AI Integration (Google Gemini)

**Use Cases:**
- Quote generation from project details
- Email draft creation
- Lead scoring analysis
- Data enrichment

**n8n Workflow Example:**
```
Project reaches "qualified" stage
       ↓
[n8n trigger]
       ↓
[Gemini API: Generate quote items]
       ↓
[Create quote in CRM]
       ↓
[Notify sales rep]
```

---

## 🎨 UI/UX Design System

### Design Tokens

```typescript
// Tailwind configuration
const colors = {
  primary: 'hsl(var(--primary))',      // Purple gradient
  secondary: 'hsl(var(--secondary))',  // Accent color
  background: 'hsl(var(--background))', // Dark: #09090b, Light: #ffffff
  foreground: 'hsl(var(--foreground))', // Text color
  muted: 'hsl(var(--muted))',          // Subtle backgrounds
  border: 'hsl(var(--border))',        // Border color
  destructive: 'hsl(var(--destructive))', // Red for errors
};

const spacing = {
  container: {
    mobile: 'px-4',
    desktop: 'container mx-auto px-6 lg:px-8',
  },
  section: 'py-6 md:py-8',
  card: 'p-4 md:p-6',
};

const typography = {
  h1: 'text-3xl md:text-4xl font-bold',
  h2: 'text-2xl md:text-3xl font-semibold',
  h3: 'text-xl md:text-2xl font-semibold',
  body: 'text-base',
  small: 'text-sm text-muted-foreground',
};
```

### Component Library

**shadcn/ui Components (30+):**
- Button, Input, Textarea, Select
- Card, Sheet, Dialog, Drawer
- Table, Tabs, Accordion
- DropdownMenu, ContextMenu, Popover
- Badge, Avatar, Skeleton
- Toast (Sonner), Alert, Progress
- Calendar, DatePicker, TimePicker

### Responsive Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
};

// Usage
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

### Mobile-First Patterns

**Desktop:**
```
┌────────────────────────────────────────┐
│  Sidebar  │  Header + Content          │
│           │                            │
│  Nav      │  ┌──────────────────┐     │
│  Items    │  │  Content Cards    │     │
│           │  └──────────────────┘     │
└────────────────────────────────────────┘
```

**Mobile:**
```
┌────────────────────────────────┐
│  Header (with hamburger menu)  │
├────────────────────────────────┤
│                                │
│  Content (full width)          │
│                                │
│  ┌──────────────────────┐     │
│  │  Content Cards        │     │
│  └──────────────────────┘     │
│                                │
├────────────────────────────────┤
│  Bottom Navigation Bar         │
│  [Home] [Companies] [+] [...]  │
└────────────────────────────────┘
```

### Dark Mode Support

**Implementation:**
```tsx
// Theme provider wraps entire app
<ThemeProvider defaultTheme="system" storageKey="dirq-theme">
  <App />
</ThemeProvider>

// Toggle component
<ThemeToggle /> // Sun/Moon icon in header

// CSS variables automatically switch
--background: light-mode-value;
@media (prefers-color-scheme: dark) {
  --background: dark-mode-value;
}
```

---

## 📊 Data Flow Diagrams

### Create Quote Flow

```
User clicks "Create Quote"
        ↓
QuoteForm opens (dialog)
        ↓
User selects:
- Company (dropdown with search)
- Contact (filtered by company)
- Project (optional link)
- Quote items (add/remove rows)
        ↓
Form submission
        ↓
Zod validation
        ↓
useMutation (React Query)
        ↓
Supabase INSERT
- quotes table (header)
- quote_items table (line items)
        ↓
Database triggers:
- generate_quote_number()
- calculate_quote_totals()
        ↓
RLS policy check
        ↓
Success response
        ↓
Optimistic UI update
        ↓
Toast notification
        ↓
Redirect to QuoteDetailPage
        ↓
PDF generation
```

### Real-time Pipeline Update Flow

```
User drags project card in Kanban
        ↓
onDragEnd handler
        ↓
Optimistic UI update (instant)
        ↓
useMutation (React Query)
        ↓
Supabase UPDATE projects SET stage = 'quote_sent'
        ↓
Database trigger: update_project_stage_from_quote
        ↓
Realtime subscription broadcasts change
        ↓
Other connected users see update
        ↓
Toast notification with company name
        ↓
invalidateQueries(['projects', 'pipeline-stats'])
        ↓
Charts re-fetch and update
```

### Google Calendar Sync Flow

```
User creates calendar event in CRM
        ↓
INSERT into calendar_events
        ↓
Database trigger: sync_to_google_calendar
        ↓
Edge Function: sync-to-google
        ↓
Google Calendar API POST
        ↓
Event created in Google Calendar
        ↓
google_event_id saved in CRM
        ↓
Google webhook notifies changes
        ↓
Edge Function: google-calendar-webhook
        ↓
UPDATE calendar_events SET last_synced_at
        ↓
Realtime subscription updates UI
```

---

## 🚀 Deployment Architecture

### Infrastructure Stack

```
┌─────────────────────────────────────────────────────┐
│  DNS & SSL                                          │
│  Netlify DNS + Let's Encrypt SSL                   │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│  CDN & Static Hosting                               │
│  Netlify Edge Network (Global CDN)                  │
│  - React SPA (build output)                         │
│  - Assets cached at edge                            │
│  - Automatic HTTPS                                  │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│  Serverless Functions                               │
│  Supabase Edge Functions (Deno Runtime)             │
│  - send-sign-email                                  │
│  - google-calendar-webhook                          │
│  - sync-to-google                                   │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│  Database & Backend                                 │
│  Supabase (AWS eu-west-1)                           │
│  - PostgreSQL 15 database                           │
│  - Auth service                                     │
│  - Storage (S3-compatible)                          │
│  - Realtime (WebSocket server)                      │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│  External Services                                   │
│  - n8n Cloud (automation)                           │
│  - Google Calendar API                              │
│  - Resend (email)                                   │
│  - Sentry (monitoring)                              │
└─────────────────────────────────────────────────────┘
```

### Build Pipeline

```bash
# 1. Local development
npm run dev              # Vite dev server (localhost:8080)

# 2. Type checking
npm run type-check       # TypeScript validation

# 3. Build for production
npm run build            # Vite build → dist/
  ↓
  - TypeScript compilation
  - Tree shaking & minification
  - Code splitting (lazy routes)
  - Asset optimization
  - Source maps generation

# 4. Deploy to Netlify
git push origin main
  ↓
  Netlify detects push
  ↓
  Runs build command
  ↓
  Deploys to CDN
  ↓
  Invalidates cache
  ↓
  Live at dirq-crm.netlify.app
```

### Environment Variables

```bash
# .env.local (development)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJxxx... # Server-side only
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_RESEND_API_KEY=re_xxx
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Edge Functions (Supabase Dashboard)
RESEND_API_KEY=re_xxx
GOOGLE_CLIENT_SECRET=xxx
```

### Performance Optimizations

**Code Splitting:**
```typescript
// Lazy load non-critical pages
const WorkflowBuilder = lazy(() => import("./pages/WorkflowBuilder"));
const EmailDraftsPage = lazy(() => import("./pages/EmailDraftsPage"));

// Preload critical CRM modules (no lazy)
import CompaniesPage from "./features/companies/CompaniesPage";
import ProjectsPage from "./features/projects/ProjectsPage";
```

**Database Indexes:**
```sql
-- High-traffic queries
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_interactions_date ON interactions(created_at DESC);
CREATE INDEX idx_companies_owner ON companies(owner_id);

-- Query performance: 94% faster with indexes
```

**React Query Caching:**
```typescript
{
  staleTime: 30000,      // Data fresh for 30s
  gcTime: 300000,        // Keep in cache for 5m
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
}
```

---

## 🗺️ Feature Map

### Complete Feature Inventory

#### **Core CRM Features**

| Feature | Frontend Component | Backend Table | API/Hook | Status |
|---------|-------------------|---------------|----------|--------|
| Company Management | `CompaniesPage.tsx` | `companies` | `useCompanies` | ✅ Complete |
| Company Detail | `CompanyDetailPage.tsx` | `companies`, `subscriptions` | `useCompany` | ✅ Complete |
| Contact Management | `ContactsPage.tsx` | `contacts` | `useContacts` | ✅ Complete |
| Project/Lead Tracking | `ProjectsPage.tsx` | `projects` | `useProjects` | ✅ Complete |
| Sales Pipeline (Kanban) | `PipelinePage.tsx` | `projects` | `usePipelineStats` | ✅ Complete |
| Quote Generation | `QuotesPage.tsx` | `quotes`, `quote_items` | `useQuotes` | ✅ Complete |
| Quote E-Signature | `PublicSignQuotePage.tsx` | `quotes` (sign_token) | `useQuoteSign` | ✅ Complete |
| Dual Signatures | `DualSignatureDisplay.tsx` | `quotes` (provider_signature) | - | ✅ Complete |
| Activity Tracking | `InteractionsPage.tsx` | `interactions` | `useInteractions` | ✅ Complete |
| Task Management | `CalendarPage.tsx` | `tasks` | `useTasks` | ✅ Complete |
| Calendar | `CalendarPage.tsx` | `calendar_events` | `useCalendarEvents` | ✅ Complete |

#### **Dashboard & Analytics**

| Feature | Frontend Component | Data Source | Status |
|---------|-------------------|-------------|--------|
| Executive Dashboard | `DashboardExecutive.tsx` | Aggregated queries | ✅ Complete |
| CRM Dashboard | `DashboardCRM.tsx` | Pipeline stats, quotes | ✅ Complete |
| Super Admin Dashboard | `DashboardSuperAdmin.tsx` | User management | ✅ Complete |
| Pipeline Statistics | Charts in dashboards | `usePipelineStats` | ✅ Complete |
| Revenue Forecasting | `DashboardExecutive.tsx` | MRR calculations | ✅ Complete |
| MRR Tracking | Company subscriptions | `subscriptions` table | ✅ Complete |

#### **Automation & AI**

| Feature | Implementation | Integration | Status |
|---------|---------------|-------------|--------|
| n8n Workflows | 28 workflow templates | n8n Cloud | ✅ Complete |
| AI Quote Generation | n8n workflow | Gemini API | ✅ Complete |
| Lead Scoring | n8n workflow | Gemini API | ✅ Complete |
| Email Drafts | `EmailDraftsPage.tsx` | `email_drafts` table | ✅ Complete |
| KVK Enrichment | n8n workflow | KVK API | ✅ Complete |
| AI Chat | `AIChatPage.tsx` | Gemini API | ✅ Complete |

#### **Integrations**

| Feature | Component | Edge Function | Status |
|---------|----------|---------------|--------|
| Google Calendar Sync | `GoogleCalendarSync.tsx` | `sync-to-google`, `google-calendar-webhook` | ✅ Complete |
| Email Sending | `send-sign-email` | `send-sign-email` | ✅ Complete |
| OAuth Tokens | Encrypted storage | `pgcrypto` | ✅ Complete |
| Webhook Support | n8n triggers | 9 webhook endpoints | ✅ Complete |

#### **User Management & Security**

| Feature | Component | Implementation | Status |
|---------|----------|---------------|--------|
| Authentication | `AuthPage.tsx` | Supabase Auth | ✅ Complete |
| User Management | `UserManagement.tsx` | `profiles` table | ✅ Complete |
| Role-Based Access | `ProtectedRoute.tsx` | RLS policies | ✅ Complete |
| Audit Logging | `activityLogger.ts` | `crm_audit_log` | ✅ Complete |
| Rate Limiting | Edge Functions | `rate_limit_requests` | ✅ Complete |

#### **UI/UX Features**

| Feature | Component | Status |
|---------|----------|--------|
| Dark Mode | `ThemeToggle.tsx` | ✅ Complete |
| Internationalization | `LanguageSwitcher.tsx` (NL/EN) | ✅ Complete |
| Mobile Bottom Nav | `MobileBottomNav.tsx` | ✅ Complete |
| Command Palette | `CommandBar.tsx` (Cmd+K) | ✅ Complete |
| Notifications | `NotificationBell.tsx` | ✅ Complete |
| Pull to Refresh | `PullToRefresh.tsx` | ✅ Complete |
| Toast Messages | Sonner | ✅ Complete |
| Skeleton Loaders | shadcn/ui | ✅ Complete |

---

## 📝 Conclusion

This document provides a complete architectural blueprint of the Dirq Solutions CRM system. It covers:

✅ **Database:** 20+ tables with complete ERD and relationships  
✅ **Frontend:** Component structure, routing, state management  
✅ **Backend:** Supabase configuration, Edge Functions, RLS policies  
✅ **Security:** Authentication flow, RLS examples, encryption  
✅ **Integrations:** Google Calendar, n8n, email, AI  
✅ **UI/UX:** Design system, responsive patterns, dark mode  
✅ **Data Flows:** Complete user journey diagrams  
✅ **Deployment:** Infrastructure, build pipeline, optimization  
✅ **Feature Map:** Every feature mapped to code + database  

**For Questions or Updates:**
- See individual feature documentation in `docs/implementation/`
- Check `docs/STATUS.md` for latest feature status
- Review `CHANGELOG.md` for recent changes

**Last Updated:** 27 Januari 2026 | **Version:** 2.1.0

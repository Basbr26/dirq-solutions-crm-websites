# Dirq Solutions CRM - AI Assistant Context File

> **Purpose**: This file provides essential context for AI assistants (Claude, GPT, etc.) working on this codebase.
> **Last Verified**: 29 January 2026

---

## Project Overview

**Dirq Solutions CRM** is a Customer Relationship Management system built specifically for website developers. It manages the full sales cycle from lead to live website.

**Production URL**: https://dirqsolutionscrm.netlify.app
**Repository**: React + TypeScript frontend with Supabase backend

---

## Accurate Tech Stack (Verified from package.json)

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI library |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool |
| TailwindCSS | 3.4.17 | Styling |
| shadcn/ui | Latest | Component library (Radix-based) |
| React Query | 5.83.0 | Server state management |
| React Router | 6.30.1 | Client-side routing |
| React Hook Form | 7.61.1 | Form handling |
| Zod | 3.25.76 | Schema validation |
| react-i18next | 16.5.3 | Internationalization (NL/EN) |

### Backend & Services
| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL + Auth + Storage + RLS |
| Netlify | Hosting & CDN |

### Key Libraries
| Library | Purpose |
|---------|---------|
| @react-pdf/renderer | PDF generation |
| pdf-lib | PDF manipulation (signatures) |
| react-big-calendar | Calendar views |
| recharts | Charts & analytics |
| papaparse | CSV import/export |
| date-fns | Date formatting (NL locale) |
| sonner | Toast notifications |
| framer-motion | Animations |
| canvas-confetti | Celebration effects |
| lucide-react | Icons |

---

## Project Structure (Verified)

```
dirq-solutions-crmwebsite/
├── src/
│   ├── features/                    # Domain modules
│   │   ├── companies/               # Company management
│   │   │   ├── components/          # CompanyCard, CompanyForm, etc.
│   │   │   ├── hooks/               # useCompanies, useCompanyMutations
│   │   │   ├── __tests__/           # Unit tests
│   │   │   ├── CompaniesPage.tsx    # List page
│   │   │   └── README.md            # Module docs
│   │   ├── contacts/                # Contact management (same structure)
│   │   ├── projects/                # Pipeline/deals
│   │   ├── quotes/                  # Quotes with e-sign
│   │   ├── interactions/            # Activity logging
│   │   ├── dashboard/               # Dashboard components
│   │   ├── leads/                   # Lead management
│   │   └── pipeline/                # Kanban board
│   │
│   ├── components/                  # Shared components
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── layout/                  # AppLayout, Sidebar, Header
│   │   ├── calendar/                # Calendar & Google sync
│   │   ├── documents/               # Document handling
│   │   ├── settings/                # Settings panels
│   │   └── [various].tsx            # CommandBar, CSVImportDialog, etc.
│   │
│   ├── hooks/                       # Global hooks (~25 hooks)
│   │   ├── useAuth.tsx              # Authentication context
│   │   ├── useProfile.ts            # User profile
│   │   ├── usePagination.ts         # Server-side pagination
│   │   ├── useGlobalShortcuts.ts    # Keyboard shortcuts
│   │   ├── usePullToRefresh.tsx     # Mobile pull-to-refresh
│   │   └── ...
│   │
│   ├── lib/                         # Utilities
│   │   ├── logger.ts                # Structured logging
│   │   ├── googleCalendar.ts        # Google Calendar API
│   │   ├── crmNotifications.ts      # Notification helpers
│   │   ├── financialCalculations.ts # MRR/ARR calculations
│   │   ├── i18n.ts                  # i18n setup
│   │   ├── locales/                 # Translation files
│   │   │   ├── nl/                  # Dutch translations
│   │   │   └── en/                  # English translations
│   │   └── ...
│   │
│   ├── config/                      # Configuration
│   │   ├── pricing.ts               # Package pricing
│   │   ├── pipeline.ts              # Pipeline stages
│   │   └── ...
│   │
│   ├── pages/                       # Route pages
│   │   ├── DashboardCRM.tsx         # Main dashboard
│   │   ├── DashboardExecutive.tsx   # Executive view
│   │   ├── CalendarPage.tsx         # Calendar
│   │   ├── PublicSignQuotePage.tsx  # Public quote signing
│   │   ├── PublicSignPage.tsx       # Public document signing
│   │   └── ...
│   │
│   ├── types/                       # TypeScript types
│   │   ├── crm.ts                   # Main CRM types
│   │   ├── projects.ts              # Project types
│   │   ├── quotes.ts                # Quote types
│   │   └── ...
│   │
│   ├── integrations/
│   │   └── supabase/                # Supabase client & types
│   │       ├── client.ts            # Configured client
│   │       └── types.ts             # Auto-generated DB types
│   │
│   ├── App.tsx                      # App root with routes
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Global styles
│
├── supabase/
│   ├── migrations/                  # Database migrations
│   └── functions/                   # Edge functions
│       ├── google-oauth-exchange/   # OAuth token exchange
│       ├── google-calendar-refresh/ # Token refresh
│       ├── send-sign-email/         # Sign link emails
│       └── ingest-prospect/         # API gateway
│
├── docs/                            # Documentation
│   ├── ARCHITECTURE.md              # Technical architecture
│   ├── N8N_WORKFLOWS.md             # n8n automation
│   └── ...
│
├── scripts/
│   └── sql/                         # SQL scripts
│
└── public/                          # Static assets
```

---

## Key Patterns

### 1. Data Fetching (React Query)
```typescript
// Query pattern - src/features/companies/hooks/useCompanies.ts
export const useCompanies = (filters?: CompanyFilters) => {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*', { count: 'exact' });
      if (error) throw error;
      return data;
    },
  });
};

// Mutation pattern
export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (company) => {
      const { data, error } = await supabase.from('companies').insert(company).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(t('companies.created'));
    },
  });
};
```

### 2. Supabase Queries with Relations
```typescript
// Always specify FK when ambiguous
const { data } = await supabase
  .from('quotes')
  .select(`
    *,
    company:companies!quotes_company_id_fkey(id, name, email),
    contact:contacts!quotes_contact_id_fkey(id, first_name, last_name),
    owner:profiles!quotes_owner_id_fkey(id, voornaam, achternaam)
  `)
  .eq('id', id)
  .single();
```

### 3. i18n Translations
```typescript
// Using translations
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();

// In JSX
<Button>{t('common.save')}</Button>
<p>{t('quotes.statusChangedTo', { status: newStatus })}</p>
```

### 4. Toast Notifications
```typescript
import { toast } from 'sonner';

toast.success(t('common.saved'));
toast.error(t('errors.saveFailed'));
toast.loading(t('common.saving'));
```

### 5. Structured Logging
```typescript
import { logger } from '@/lib/logger';

logger.info('Action completed', { context: 'quote_sign', quote_id: id });
logger.error(error, { context: 'quote_provider_signature', quote_id: id });
```

---

## Database Schema (Core Tables)

### quotes
```sql
- id: UUID (PK)
- quote_number: TEXT (unique)
- title: TEXT
- company_id: UUID (FK → companies)
- contact_id: UUID (FK → contacts)
- owner_id: UUID (FK → profiles)
- status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
- sign_status: 'pending' | 'sent' | 'signed' | 'rejected'
- signature_data: TEXT (base64 customer signature)
- provider_signature_data: TEXT (base64 provider signature)
- provider_signed_at: TIMESTAMPTZ
- sign_token: UUID (for public signing)
- sign_link_expires_at: TIMESTAMPTZ
- subtotal, tax_amount, total_amount: DECIMAL
```

### projects (Pipeline)
```sql
- id: UUID (PK)
- title: TEXT
- company_id: UUID (FK → companies)
- owner_id: UUID (FK → profiles)
- stage: 'lead' | 'contacted' | 'meeting_scheduled' | 'quote_sent' | 'quote_signed' | 'won' | 'lost' | ...
- value: DECIMAL
- probability: INTEGER (0-100)
- mrr: DECIMAL (monthly recurring revenue)
```

### companies
```sql
- id: UUID (PK)
- name: TEXT
- email, phone, website: TEXT
- status: 'prospect' | 'active' | 'inactive' | 'churned'
- total_mrr: DECIMAL (auto-calculated via trigger)
- kvk_number: TEXT (unique)
- owner_id: UUID (FK → profiles)
```

### interactions
```sql
- id: UUID (PK)
- type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'demo'
- company_id, contact_id, quote_id, lead_id: UUID (FKs)
- is_task: BOOLEAN
- due_date: TIMESTAMPTZ
- completed: BOOLEAN
```

---

## Important Files to Know

| File | Purpose |
|------|---------|
| `src/features/quotes/QuoteDetailPage.tsx` | Quote detail with dual signatures |
| `src/features/quotes/components/QuotePDFDocument.tsx` | PDF generation template |
| `src/pages/PublicSignQuotePage.tsx` | Public customer signing page |
| `src/lib/googleCalendar.ts` | Google Calendar sync logic |
| `src/components/calendar/GoogleCalendarSync.tsx` | Calendar sync UI |
| `src/hooks/useAuth.tsx` | Authentication context & hooks |
| `src/lib/logger.ts` | Structured logging utility |
| `src/config/pricing.ts` | Package & addon pricing |

---

## Common Tasks

### Adding a new feature
1. Create folder in `src/features/[feature-name]/`
2. Add `components/`, `hooks/` subfolders
3. Create main page `[Feature]Page.tsx`
4. Add hooks `use[Feature].ts` and `use[Feature]Mutations.ts`
5. Add route in `src/App.tsx`
6. Add translations in `src/lib/locales/nl/` and `en/`

### Adding a database column
1. Create migration in `supabase/migrations/`
2. Update types in `src/integrations/supabase/types.ts` (or regenerate)
3. Update relevant TypeScript types in `src/types/`

### Fixing Supabase errors
- **PGRST204**: Column doesn't exist - check column name spelling
- **PGRST201**: FK ambiguity - specify FK name in query (e.g., `!quotes_company_id_fkey`)
- **403 Forbidden**: RLS policy issue - check if user has access

---

## Testing

```bash
npm test              # Run all tests
npm run test:ui       # Visual test runner
npm run test:coverage # Coverage report
npm run type-check    # TypeScript check
```

Tests are located in `__tests__/` folders next to the code they test.

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com  # Optional
```

---

## User Roles (RBAC)

| Role | Access |
|------|--------|
| ADMIN | Full access to all data and settings |
| MANAGER | View all, edit own + team data |
| SALES | View/edit only own data |
| SUPPORT | Read-only access |
| SYSTEM | Automation user for n8n workflows |

---

## Quick Reference

### Valid Quote Statuses
- Database constraint: `'draft'`, `'sent'`, `'accepted'`, `'declined'`, `'expired'`
- Sign statuses: `'pending'`, `'sent'`, `'signed'`, `'rejected'`

### Pipeline Stages
`lead` → `contacted` → `meeting_scheduled` → `quote_sent` → `quote_signed` → `won` | `lost`

### Date Formatting
```typescript
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

format(new Date(), 'dd MMMM yyyy', { locale: nl }) // "29 januari 2026"
```

### Currency Formatting
```typescript
new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
// "€ 1.234,56"
```

---

## Known Issues / Gotchas

1. **Quote status 'signed'** is NOT valid - use `'accepted'` for the `status` column
2. **sign_token_expires_at** column doesn't exist - use `sign_link_expires_at`
3. **Google Calendar**: Uses refresh tokens stored in database, Edge Function handles server-side refresh
4. **FK queries**: Always specify FK name when table has multiple FKs to same target

---

**Last Updated**: 29 January 2026
**Maintained By**: AI-assisted development

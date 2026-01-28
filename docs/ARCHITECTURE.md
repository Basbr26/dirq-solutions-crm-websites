# 🏗️ CRM Architecture Documentation

Complete technical architecture voor Dirq Solutions CRM applicatie.

---

## 📋 Table of Contents

1. [Tech Stack](#-tech-stack)
2. [Project Structure](#-project-structure)
3. [State Management](#-state-management)
4. [Authentication & Authorization](#-authentication--authorization)
5. [Database Architecture](#-database-architecture)
6. [API Patterns](#-api-patterns)
7. [Testing Strategy](#-testing-strategy)
8. [Deployment](#-deployment)
9. [Performance Optimization](#-performance-optimization)
10. [Security Architecture](#-security-architecture)

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI library met hooks |
| **TypeScript** | 5.8.3 | Type-safe development |
| **Vite** | 5.4.19 | Build tool & dev server |
| **TailwindCSS** | 3.4.17 | Utility-first styling |
| **Shadcn/ui** | Latest | Component library |
| **React Query** | 5.83.0 | Server state management |
| **React Router** | 6.30.1 | Client-side routing |
| **React Hook Form** | 7.61.1 | Form management |
| **Zod** | 3.25.76 | Schema validation |

### Backend & Services

| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase** | Latest | PostgreSQL database + Auth + RLS |
| **Supabase JS** | 2.81.1 | Database client |
| **PostgreSQL** | 15+ | Relational database |
| **PostgREST** | - | Auto-generated REST API |

### Development & Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vitest** | 4.0.17 | Unit & integration testing |
| **React Testing Library** | 16.3.1 | Component testing |
| **ESLint** | 9.32.0 | Code linting |
| **Prettier** | - | Code formatting |

### Internationalization

| Technology | Version | Purpose |
|------------|---------|---------|
| **react-i18next** | 16.5.3 | i18n framework |
| **i18next** | 25.7.4 | Translation engine |

---

## 📁 Project Structure

## 📁 Project Structure

```
dirq-solutions-crmwebsite/
├── public/                          # Static assets
│
├── src/
│   ├── components/                  # Shared components
│   │   ├── ui/                      # Shadcn/ui components
│   │   ├── layout/                  # AppLayout, Sidebar, Header
│   │   ├── calendar/                # Calendar & Google sync
│   │   ├── documents/               # Document handling
│   │   ├── settings/                # Settings panels
│   │   └── ai/                      # AI integrations
│   │
│   ├── features/                    # Feature modules (domain-driven)
│   │   ├── companies/               # Companies CRUD
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── __tests__/
│   │   │   ├── CompaniesPage.tsx
│   │   │   └── README.md
│   │   │
│   │   ├── contacts/                # Contacts CRUD
│   │   ├── projects/                # Pipeline management
│   │   ├── quotes/                  # Quote generation & signing
│   │   ├── interactions/            # Communication tracking
│   │   ├── dashboard/               # Dashboard components
│   │   ├── leads/                   # Lead management
│   │   └── pipeline/                # Kanban board
│   │
│   ├── hooks/                       # Global hooks (~25 hooks)
│   │   ├── useAuth.tsx              # Authentication context
│   │   ├── useProfile.ts            # User profile
│   │   ├── usePagination.ts         # Server-side pagination
│   │   ├── useGlobalShortcuts.ts    # Keyboard shortcuts
│   │   ├── usePullToRefresh.tsx     # Mobile pull-to-refresh
│   │   └── ...
│   │
│   ├── integrations/
│   │   └── supabase/                # Supabase client & types
│   │       ├── client.ts            # Configured client
│   │       └── types.ts             # Database types (auto-generated)
│   │
│   ├── lib/                         # Utilities & helpers
│   │   ├── logger.ts                # Structured logging
│   │   ├── googleCalendar.ts        # Google Calendar API
│   │   ├── crmNotifications.ts      # Notification helpers
│   │   ├── financialCalculations.ts # MRR/ARR calculations
│   │   ├── i18n.ts                  # i18n setup
│   │   └── locales/                 # Translation files
│   │       ├── nl/                  # Dutch translations
│   │       └── en/                  # English translations
│   │
│   ├── config/                      # Configuration
│   │   ├── pricing.ts               # Package pricing
│   │   ├── pipeline.ts              # Pipeline stages
│   │   └── ...
│   │
│   ├── pages/                       # Route pages
│   │   ├── DashboardCRM.tsx         # Main dashboard
│   │   ├── CalendarPage.tsx         # Calendar
│   │   ├── PublicSignQuotePage.tsx  # Public quote signing
│   │   └── ...
│   │
│   ├── types/                       # TypeScript types
│   │   ├── crm.ts                   # Main CRM types
│   │   ├── projects.ts              # Project types
│   │   ├── quotes.ts                # Quote types
│   │   └── ...
│   │
│   ├── App.tsx                      # App root with routes
│   └── main.tsx                     # Entry point
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
│   ├── ARCHITECTURE.md              # This file
│   └── N8N_WORKFLOWS.md             # Automation workflows
│
├── scripts/
│   └── sql/                         # SQL scripts
│
├── CLAUDE.md                        # AI assistant context
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### Feature Module Pattern

Elk feature module volgt deze structuur:

```
feature/
├── components/              # Feature-specific components
│   ├── FeatureCard.tsx
│   ├── FeatureForm.tsx
│   └── FeatureFilters.tsx
│
├── hooks/                   # Feature hooks
│   ├── useFeatures.ts       # Query hook
│   └── useFeatureMutations.ts  # Mutation hooks
│
├── utils/                   # Feature utilities
│   └── helpers.ts
│
├── FeaturePage.tsx          # Main page
├── FeatureDetailPage.tsx    # Detail page
└── README.md                # Feature documentation
```

---

## 🔄 State Management

### React Query for Server State

**Alle server data** wordt beheerd via React Query (TanStack Query).

**Query Pattern:**
```typescript
// src/features/companies/hooks/useCompanies.ts
export const useCompanies = (filters?: CompanyFilters) => {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: async () => {
      let query = supabase.from('companies').select('*', { count: 'exact' });
      
      // Apply filters
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      
      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count };
    },
    staleTime: 30_000,  // 30 seconds
  });
};
```

**Mutation Pattern:**
```typescript
// src/features/companies/hooks/useCompanyMutations.ts
export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newCompany: InsertCompany) => {
      const { data, error } = await supabase
        .from('companies')
        .insert(newCompany)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      
      // Show toast
      toast.success('Bedrijf aangemaakt');
    },
  });
};
```

**Query Key Patterns:**
- `['companies']` - All companies
- `['companies', filters]` - Filtered companies
- `['companies', id]` - Single company
- `['companies', id, 'contacts']` - Related data

**Cache Strategy:**
- **staleTime: 30_000** (30 sec) - Data considered fresh
- **cacheTime: 300_000** (5 min) - Cached in memory
- **refetchOnWindowFocus: true** - Auto-refresh on tab focus
- **retry: 3** - Retry failed requests

### Local UI State

**Gebruik React hooks** voor local state:

```typescript
// Form state
const [formData, setFormData] = useState<CompanyForm>({});

// Modal state
const [isOpen, setIsOpen] = useState(false);

// Filter state (with URL sync)
const [filters, setFilters] = useFilterParams<CompanyFilters>();
```

### Global State (Context)

**Authentication state** via Context:

```typescript
// src/hooks/useAuth.tsx
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Listen to auth changes
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Fetch profile...
    });
  }, []);
  
  return (
    <AuthContext.Provider value={{ session, profile, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 🔐 Authentication & Authorization

### Supabase Auth

**Authentication flow:**

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Logout
await supabase.auth.signOut();
```

### Role-Based Access Control (RBAC)

**Roles hierarchy:**
```
ADMIN > MANAGER > SALES > LIMITED
```

**Role definitions:**

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full access, user management, system settings |
| **MANAGER** | View all data, manage team, reporting |
| **SALES** | CRUD own data, view assigned companies |
| **LIMITED** | Read-only access |

**Implementation:**

```typescript
// In components
const { profile } = useAuth();

if (profile?.role !== 'ADMIN') {
  return <AccessDenied />;
}

// In hooks
const canEdit = useMemo(() => {
  if (profile?.role === 'ADMIN') return true;
  if (profile?.role === 'MANAGER') return true;
  if (profile?.role === 'SALES' && item.owner_id === profile.id) return true;
  return false;
}, [profile, item]);
```

### Row Level Security (RLS)

**Database-level authorization** via PostgreSQL RLS:

```sql
-- Example: Companies table
CREATE POLICY "Users can view companies they have access to"
ON companies FOR SELECT
USING (
  -- ADMIN/MANAGER see all
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
  )
  OR
  -- SALES see assigned companies
  id IN (
    SELECT company_id FROM company_access
    WHERE user_id = auth.uid()
  )
);
```

**RLS Policies per table:**
- **companies**: Role-based visibility
- **contacts**: Inherit from company access
- **projects**: Owner + ADMIN/MANAGER
- **quotes**: Company access required
- **interactions**: Owner or ADMIN/MANAGER

---

## 🗄️ Database Architecture

### Schema Overview

```
┌─────────────┐
│  profiles   │  ← User accounts (extends auth.users)
└──────┬──────┘
       │
       │ owner_id
       ↓
┌─────────────┐      ┌─────────────┐
│  companies  │←────→│  contacts   │  
└──────┬──────┘      └──────┬──────┘
       │                    │
       │ company_id         │ contact_id
       ↓                    ↓
┌─────────────┐      ┌─────────────┐
│  projects   │←────→│ interactions│
└──────┬──────┘      └─────────────┘
       │
       │ project_id
       ↓
┌─────────────┐
│   quotes    │
└──────┬──────┘
       │
       │ quote_id
       ↓
┌─────────────┐
│ quote_items │
└─────────────┘
```

### Core Tables

**profiles**
- Extends Supabase auth.users
- Stores: role, full_name, avatar_url, settings
- Primary user entity

**companies**
- CRM companies/accounts
- Status: prospect, active, inactive, churned
- Includes: MRR, company_size, priority

**contacts**
- Individuals within companies
- Flags: is_primary, is_decision_maker
- Links to company

**projects**
- Sales pipeline items
- 9 stages: lead → live
- Probability tracking
- Owner assignment

**quotes**
- Offer documents
- Dual signature workflow
- PDF generation
- Status: draft → signed

**quote_items**
- Line items per quote
- Quantity, unit_price, tax
- Sort ordering

**interactions**
- Communication log
- Types: call, email, meeting, note
- Task management
- RBAC filtering

### Indexes

**Performance indexes:**
```sql
-- Companies
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_priority ON companies(priority);
CREATE INDEX idx_companies_owner ON companies(owner_id);

-- Contacts
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_primary ON contacts(company_id) WHERE is_primary = true;

-- Projects
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_company ON projects(company_id);

-- Interactions
CREATE INDEX idx_interactions_company ON interactions(company_id);
CREATE INDEX idx_interactions_owner ON interactions(owner_id);
CREATE INDEX idx_interactions_task ON interactions(is_task) WHERE is_task = true;
```

### Triggers

**Automatic updates:**
```sql
-- Update updated_at timestamp
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update last_contact_date
CREATE TRIGGER update_company_last_contact
AFTER INSERT ON interactions
FOR EACH ROW EXECUTE FUNCTION update_last_contact_date();

-- Calculate MRR
CREATE TRIGGER calculate_company_mrr
AFTER INSERT OR UPDATE ON finance_packages
FOR EACH ROW EXECUTE FUNCTION recalculate_company_mrr();
```

### Migrations

**Migration workflow:**
1. Create migration file: `supabase/migrations/YYYYMMDD_description.sql`
2. Test locally: `supabase db reset`
3. Apply to production: Supabase Dashboard SQL Editor
4. Verify: Run verification queries

**Migration best practices:**
- ✅ Use `IF NOT EXISTS` for idempotency
- ✅ Add comments for documentation
- ✅ Create indexes for foreign keys
- ✅ Test rollback scripts
- ✅ Version control all migrations

---

## 🔌 API Patterns

### Supabase Client

**Centralized client:**
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

### Query Patterns

**Select:**
```typescript
// Simple select
const { data, error } = await supabase
  .from('companies')
  .select('*');

// Select with relations
const { data, error } = await supabase
  .from('companies')
  .select(`
    *,
    contacts (*),
    projects (*)
  `);

// Select with filters
const { data, error } = await supabase
  .from('companies')
  .select('*')
  .eq('status', 'active')
  .gte('mrr', 1000)
  .order('created_at', { ascending: false })
  .range(0, 9);  // Pagination
```

**Insert:**
```typescript
const { data, error } = await supabase
  .from('companies')
  .insert({
    name: 'Acme Corp',
    email: 'contact@acme.com',
    status: 'prospect',
  })
  .select()
  .single();
```

**Update:**
```typescript
const { data, error } = await supabase
  .from('companies')
  .update({ status: 'active' })
  .eq('id', companyId)
  .select()
  .single();
```

**Delete (soft):**
```typescript
// Prefer soft delete
const { error } = await supabase
  .from('companies')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', companyId);
```

### RPC Functions

**Call stored procedures:**
```typescript
// Convert lead to customer
const { data, error } = await supabase.rpc('convert_lead_to_customer', {
  p_project_id: projectId,
  p_company_id: companyId,
});

// Get dashboard statistics
const { data, error } = await supabase.rpc('get_dashboard_stats', {
  user_id: userId,
});
```

### Real-time Subscriptions

**Listen to changes:**
```typescript
// Subscribe to new companies
const subscription = supabase
  .channel('companies_channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'companies',
    },
    (payload) => {
      console.log('New company:', payload.new);
      queryClient.invalidateQueries(['companies']);
    }
  )
  .subscribe();

// Cleanup
return () => {
  subscription.unsubscribe();
};
```

### Error Handling

**Standard error pattern:**
```typescript
try {
  const { data, error } = await supabase
    .from('companies')
    .select('*');
  
  if (error) throw error;
  
  return data;
} catch (error) {
  logger.error('Failed to fetch companies', {
    error: error.message,
    context: { userId: user?.id },
  });
  
  toast.error('Kon bedrijven niet ophalen');
  throw error;
}
```

---

## 🧪 Testing Strategy

### Test Pyramid

```
        /\
       /  \      E2E Tests (5%)
      /────\     Playwright
     /      \    
    /────────\   Integration Tests (15%)
   /          \  Vitest + React Testing Library
  /────────────\ 
 /              \ Unit Tests (80%)
/________________\ Vitest
```

### Unit Tests

**Test hooks:**
```typescript
// tests/hooks/useCompanies.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useCompanies } from '@/features/companies/hooks/useCompanies';

describe('useCompanies', () => {
  it('should fetch companies', async () => {
    const { result } = renderHook(() => useCompanies());
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

**Test components:**
```typescript
// tests/components/CompanyCard.test.tsx
import { render, screen } from '@testing-library/react';
import { CompanyCard } from '@/features/companies/components/CompanyCard';

describe('CompanyCard', () => {
  it('should render company name', () => {
    render(<CompanyCard company={mockCompany} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });
});
```

### Integration Tests

**Test workflows:**
```typescript
// tests/workflows/create-company.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import { CompanyForm } from '@/features/companies/CompanyForm';

describe('Create Company Workflow', () => {
  it('should create company successfully', async () => {
    render(<CompanyForm />);
    
    await userEvent.type(screen.getByLabelText('Bedrijfsnaam'), 'Test Corp');
    await userEvent.type(screen.getByLabelText('Email'), 'test@corp.com');
    await userEvent.click(screen.getByText('Opslaan'));
    
    expect(await screen.findByText('Bedrijf aangemaakt')).toBeInTheDocument();
  });
});
```

### Test Configuration

**vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
});
```

### Mocking

**Mock Supabase:**
```typescript
// tests/mocks/supabase.ts
export const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      data: mockData,
      error: null,
    })),
  })),
  auth: {
    getSession: vi.fn(() => ({ data: { session: mockSession } })),
  },
};
```

### Test Coverage

**Current coverage:**
- Unit tests: 316 passing
- Integration tests: Included in unit tests
- Coverage: 80%+ for critical paths

**Run tests:**
```bash
npm test                 # Run all tests
npm run test:ui          # Visual test UI
npm run test:coverage    # Coverage report
```

---

## 🚀 Deployment

### Build Process

**Production build:**
```bash
npm run build
```

**Output:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js     # Main bundle
│   ├── vendor-[hash].js    # Dependencies
│   └── [feature]-[hash].js # Code-split chunks
```

### Environment Variables

**Required variables:**
```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# Optional: AI Features
VITE_OPENAI_API_KEY=sk-xxx

# Optional: Google Calendar
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

### Deployment Platforms

**Recommended: Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Alternative: Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

**Build settings:**
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18+

### CI/CD

**GitHub Actions workflow:**
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm test
      - run: npm run build
      
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## ⚡ Performance Optimization

### Code Splitting

**Automatic route-based splitting:**
```typescript
// src/App.tsx
const CompaniesPage = lazy(() => import('@/features/companies/CompaniesPage'));
const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage'));

// Wrapped in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/companies" element={<CompaniesPage />} />
    <Route path="/projects" element={<ProjectsPage />} />
  </Routes>
</Suspense>
```

### React Optimization

**Memoization:**
```typescript
// Memo components
const CompanyCard = memo(({ company }) => {
  return <div>{company.name}</div>;
});

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize computed values
const sortedCompanies = useMemo(() => {
  return companies.sort((a, b) => a.name.localeCompare(b.name));
}, [companies]);
```

### Query Optimization

**Prefetching:**
```typescript
// Prefetch on hover
const prefetchCompany = (id: string) => {
  queryClient.prefetchQuery({
    queryKey: ['companies', id],
    queryFn: () => fetchCompany(id),
  });
};

<Link onMouseEnter={() => prefetchCompany(id)}>
  View Company
</Link>
```

**Pagination:**
```typescript
// Use range for pagination
const { data } = await supabase
  .from('companies')
  .select('*', { count: 'exact' })
  .range(page * pageSize, (page + 1) * pageSize - 1);
```

### Asset Optimization

**Images:**
- Use WebP format
- Lazy load images: `loading="lazy"`
- Optimize with TinyPNG

**Fonts:**
- Preload critical fonts
- Use `font-display: swap`

**Bundle size:**
- Current main bundle: ~200KB gzipped
- Vendor bundle: ~150KB gzipped
- Target: <300KB total

---

## 🔒 Security Architecture

### Frontend Security

**XSS Prevention:**
- React auto-escapes by default
- Sanitize HTML with DOMPurify
- Validate all user inputs with Zod

**CSRF Protection:**
- Supabase handles CSRF tokens
- Use secure cookies (httpOnly)

**Input Validation:**
```typescript
// All forms use Zod schemas
const companySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(255),
  website: z.string().url().optional(),
});

// Validate before submit
const result = companySchema.safeParse(formData);
if (!result.success) {
  // Show validation errors
}
```

### Database Security

**RLS Enforcement:**
- All tables have RLS enabled
- Policies enforce role-based access
- No client can bypass RLS

**Audit Logging:**
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(50),
  table_name VARCHAR(50),
  record_id UUID,
  changes JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Encryption:**
- All connections use SSL/TLS
- Sensitive data encrypted at rest
- API keys in environment variables (never in code)

### Authentication Security

**Password requirements:**
- Minimum 8 characters
- Enforced by Supabase Auth
- Rate limiting on login attempts

**Session management:**
- JWT tokens with refresh
- Auto-refresh before expiry
- Logout clears all tokens

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/ui Components](https://ui.shadcn.com)

---

**Document Version:** 1.1  
**Last Updated:** 29 Januari 2026  
**Maintained By:** Development Team

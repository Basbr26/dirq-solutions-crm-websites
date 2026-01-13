# 📝 Dirq Solutions CRM - Changelog

Alle updates, features, bugfixes en migraties in chronologische volgorde.

---

## [Unreleased]

*Geen uncommitted wijzigingen*

---

## [2.0.2] - 2026-01-13 - RLS Policy Simplification & FK Fixes

### 🐛 Fixed
- **RLS Policy Issues**
  - Simplified all RLS policies from role-based checks to `auth.uid() IS NOT NULL`
  - Fixed 403 Forbidden errors on contact/project creation
  - Fixed 403 Forbidden on project detail page JOIN queries
  - Moved role checking to application layer (ProtectedRoute components)
  - Resolved circular dependency with `get_user_role()` function

- **Foreign Key Ambiguity**
  - Fixed ProjectDetailPage query PGRST201 error
  - Explicitly specified FK relationship: `companies!projects_company_id_fkey`
  - Resolved multiple FK relationship confusion

- **Notification Column Names**
  - Fixed project stage change notifications
  - Updated `entity_type` → `related_entity_type`
  - Updated `entity_id` → `related_entity_id`

### 📦 Migrations
- `20260113_fix_contacts_insert_policy.sql`
- `20260113_fix_projects_insert_policy.sql`
- `20260113_fix_projects_select_policy.sql`
- `20260113_fix_projects_update_delete_policies.sql`
- `20260113_fix_companies_select_policy.sql`
- `20260113_fix_contacts_select_policy.sql`

### 📝 Changed
- Updated STATUS.md to v2.0.2
- Updated README.md version badge
- All RLS policies now use simplified authentication check

---

## [2.0.0] - 2026-01-09 - Project Velocity Complete (Database + API Gateway)

### 🎯 Added - Fase 1 (Database Foundation)
- **External Data Integration Fields**
  - `linkedin_url` (TEXT) - LinkedIn company URL voor Apollo.io enrichment
  - `website_url` (TEXT) - Company website voor API ingestion
  - `phone` (TEXT) - Main phone number voor API ingestion
  - `kvk_number` (TEXT, UNIQUE) - Dutch Chamber of Commerce number
  - `source` (TEXT, CHECK) - Data source tracking (Manual, Apollo, KVK, Manus, n8n_automation, Website)
  - `ai_audit_summary` (TEXT) - AI-generated audit van Manus/Gemini
  - `tech_stack` (TEXT[]) - Technology stack array
  - `video_audit_url` (TEXT) - Manus AI video audit URL
  - `total_mrr` (DECIMAL) - **Auto-calculated** monthly recurring revenue

- **Project Finance & Tracking**
  - `package_id` (TEXT, CHECK) - Package type: finance_starter, finance_growth
  - `selected_addons` (TEXT[]) - Addon IDs: addon_logo, addon_rush, addon_page
  - `calculated_total` (DECIMAL) - Total one-time project cost
  - `monthly_recurring_revenue` (DECIMAL) - MRR per project
  - `intake_status` (JSONB) - Onboarding checklist (logo, colors, texts, nba_check)
  - `dns_status` (TEXT, CHECK) - DNS propagation: pending, active, failed, propagated
  - `hosting_provider` (TEXT) - Hosting provider name

- **Data Integrity Layer**
  - Foreign Key: `projects.company_id` → `companies.id` (CASCADE DELETE)
  - CHECK constraints: source, dns_status, package_id validation
  - UNIQUE constraint: kvk_number per company

- **Performance Indexes**
  - `idx_companies_kvk` - Fast KVK API lookups
  - `idx_companies_linkedin` - Apollo enrichment queries
  - `idx_companies_source` - Source filtering
  - `idx_projects_package` - Package analytics
  - `idx_projects_intake_logo` - Onboarding status queries

- **MRR Aggregation System**
  - Trigger: `update_company_mrr()` - Auto-recalculates company.total_mrr
  - Fires on: projects INSERT/UPDATE/DELETE
  - Prevents manual MRR desync
  - Ensures accurate revenue tracking

### 🎯 Added - Fase 2 (API Gateway)
- **Secure Edge Function: ingest-prospect**
  - API key authentication via `x-api-key` header
  - Zod input validation schemas (KVK format, LinkedIn URLs, etc.)
  - Idempotent UPSERT operations (safe retries via kvk_number)
  - Structured JSON logging (request_id, duration_ms, metadata)
  - Health check endpoint: `/health`
  - CORS support voor webhook integraties
  - Rate limit headers (100 requests/hour)

- **Type-Safe Pricing Architecture**
  - `src/config/pricing.ts` met const assertions
  - FINANCE_PACKAGES: STARTER (€799.95), GROWTH (€1299.95)
  - ADD_ONS: Logo (€350), Rush (€300), Extra Page (€150)
  - RECURRING_SERVICES: Hosting & Security (€50/maand)
  - `calculateProjectTotal()` helper matching DB logic
  - Type exports: PackageId, AddonId (compile-time safety)

### 🔄 Changed
- Migrations: Added paired UP/DOWN migrations voor safe rollback
- Contact Form: Added proper autocomplete attributes (given-name, family-name, email, tel)
- Companies table: +9 columns (linkedin_url, website_url, phone, kvk_number, source, ai_audit_summary, tech_stack, video_audit_url, total_mrr)
- Projects table: +7 columns (package_id, selected_addons, calculated_total, monthly_recurring_revenue, intake_status, dns_status, hosting_provider)

### 🐛 Fixed
- Column name queries: `naam` → `name` in verification queries
- Constraint existence checks: All constraints wrapped in DO blocks (idempotent migrations)
- Contact form autofill: Browser now correctly splits first/last names

### 📚 Documentation
- Added: `PROJECT_VELOCITY_COMPLETE_GUIDE.md` (720 lines) - Complete implementation guide
- Updated: `MIGRATION_GUIDE_VELOCITY_PHASE1.md` - Database migration details
- Updated: `STATUS.md` - Version 1.2.0 → 2.0.0
- Updated: `README.md` - Enterprise-grade architecture badges

### 🔐 Security
- API key authentication voor Edge Functions
- Input validation met Zod schemas
- Rate limiting headers
- Structured audit logging
- CORS configured voor n8n webhooks

### 🚀 Performance
- 5 nieuwe database indexes voor n8n automation
- Response time target: <200ms
- Auto-aggregation eliminates manual calculations
- Idempotent operations prevent duplicate data

---

## [1.0.2] - 2026-01-07 - Lead Conversion & Quotes Fix

### ✨ Added
- **Lead-to-Customer Conversion Flow** - Converteer leads naar klanten met confetti celebratie
  - New Hook: `useConvertLead` - Encapsulated conversion logic met database updates
  - Company status update: `lead` → `customer`
  - Project stage update: → `quote_signed`, probability → 90
  - Deal won notification via `notifyDealClosed()`
  - 3-second confetti animation met Dirq turquoise (#06BDC7) + complementary colors
  - Button in ProjectDetailPage: Gradient emerald→green, pulse animation, alleen bij negotiation/quote_sent stages
  - Dependencies: `canvas-confetti@1.9.3` (already installed)

### 🐛 Fixed
- **Quotes 400 Error** - Foreign key join failures opgelost
  - Root cause: Quotes tabel heeft geen `contact_id` foreign key
  - Solution: Contact ophalen via nested project join
  - Query structuur: `project:projects → contact:contacts` (nested)
  - Explicit foreign key hints: `quotes_company_id_fkey`, `quotes_project_id_fkey`, `quotes_owner_id_fkey`
  - Removed: Direct `contacts` join (non-existent relation)
- **CaseDetail Import** - Verwijderde HR pagina stond nog als lazy import in App.tsx
- **useConvertLead TypeScript** - `projectValue` scope issue in onSuccess callback
  - Fix: Destructure all params in onSuccess: `{ projectTitle, companyName, ownerId, projectValue }`
- **ProjectDetailPage TypeScript** - `project.estimated_value` bestaat niet
  - Fix: Gebruik `project.value` (correcte property naam)

### 📦 Dependencies
- `canvas-confetti@1.9.3` - Voor celebration animations
- `papaparse@5.4.1` - CSV parsing (reeds geïnstalleerd)
- `@types/papaparse` - TypeScript types

---

## [1.0.1] - 2026-01-07 - Complete HR Code Cleanup

### 🗑️ Removed - HR to CRM Transformation
- **9 HR files verwijderd** (2799 regels code)
  - `src/types/verzuimDocumentTypes.ts` - HR document types
  - `src/lib/analytics/verzuimPredictor.ts` - Absence prediction ML
  - `src/pages/CaseDetail.tsx` - HR case management
  - `src/components/TaskDialog.tsx` - HR task creation (referenced deleted taskTemplates)
  - `src/lib/documentTemplates.ts` - HR document templates
  - `src/lib/taskTemplates.ts` - Predefined HR tasks
  - `src/lib/notifications/templates.ts` - HR notification templates
  - `src/lib/notifications/escalation.ts` - HR escalation logic

### 🔄 Changed
- **Workflow Categories** - HR → CRM focused
  - Old: `'onboarding' | 'offboarding' | 'verzuim' | 'contract' | 'performance' | 'other'`
  - New: `'sales' | 'project' | 'quote' | 'lead' | 'client_onboarding' | 'other'`
- **Email Branding** - Resend email footers updated
  - Old: "© Dirq Solutions | Verzuim Management System"
  - New: "© Dirq Solutions | CRM voor Website Ontwikkeling"
  - Updated: Digest emails + Notification emails

### 📄 Documentation
- STATUS.md: Removed "Stale HR code" from Medium Priority issues
- Version bump: 1.0.0 → 1.0.1

---

## [1.0.0] - 2026-01-07 - Bugfixes & Stabiliteit

### 🐛 Fixed
- **Interactions RLS Policies** - 403 Forbidden errors opgelost bij aanmaken/ophalen interactions
  - Migration: `20260107_fix_interactions_rls.sql` - INSERT policy aangepast (visibility check ipv ownership)
  - Migration: `20260107_fix_interactions_select_policy.sql` - SELECT policy toegevoegd
- **Super Admin Role** - Database functies herkenden `super_admin` niet
  - Migration: `20260107_fix_is_admin_function.sql` - `is_admin_or_manager()` updated
- **Audit Log Trigger** - Audit trigger faalde met column/type errors
  - Migration: `20260107_fix_audit_trigger_func.sql` - Column mapping, enum casting, UUID generation
- **Quotes 400 Errors** - Database kolom `owner_id` vs code `created_by` mismatch
  - Updated: `useQuotes.ts`, `useQuoteMutations.ts`, `quotes.ts` types
  - Changed foreign key hint: `quotes_created_by_fkey` → `quotes_owner_id_fkey`
- **Calendar Events Missing** - 404 errors door ontbrekende tabel
  - Migration: `20260107_create_calendar_events.sql` - Volledige tabel met RLS
- **TypeScript Errors** - InteractionTimeline broken onClick handler
  - Removed: onClick handler referencing undefined `setEditingInteraction`

### ✨ Added
- **Calendar Integration** - Scheduled interactions in calendar view
  - CalendarPage.tsx: Fetch meetings, calls, demos (scheduled_at) + tasks (due_date)
  - Color coding: calls (blue), meetings (green), demos (cyan), tasks (orange)
- **UI Improvements**
  - CreateEventDialog: "Nieuw Event" → "Nieuwe Activiteit"
  - AddInteractionDialog: useEffect hook voor type pre-selection

### 🗃️ Database
```sql
20260107_fix_interactions_rls.sql              -- INSERT policy visibility check
20260107_fix_interactions_select_policy.sql    -- SELECT policy toegevoegd
20260107_fix_is_admin_function.sql             -- super_admin recognition
20260107_fix_audit_trigger_func.sql            -- audit_log fixes
20260107_create_calendar_events.sql            -- calendar_events tabel
```

---

## [0.9.5] - 2026-01-07 - Google Calendar Sync

### ✨ Added
- **Google Calendar Synchronization** (OAuth 2.0)
  - Bidirectional sync (CRM ↔ Google Calendar)
  - Auto-sync toggle met database persistence
  - Duplicate prevention via `google_event_id`
  - 3-month sync window (past/future)
  - Files: `googleCalendar.ts` (270 lines), `GoogleCalendarSync.tsx` (337 lines)
  - Documentation: `GOOGLE_CALENDAR_SETUP.md`

### 🗃️ Database
```sql
20260107_google_calendar_sync.sql  -- profiles extensions + calendar_events google_event_id
```

### 🔧 Config
- Environment variables: `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`
- Google Cloud Console: OAuth 2.0 client configured

---

## [0.9.0] - 2026-01-06 - Document Generation

### ✨ Added
- **CRM Document Templates** - 5 professional PDF templates
  - Contract Template (partijen, deliverables, payment)
  - Invoice Template (line items, BTW, totals)
  - Proposal Template (executive summary, objectives, investment)
  - NDA Template (confidentiality terms, duration)
  - Meeting Notes Template (attendees, decisions, action items)
- **Document Generator UI** - CRMDocumentGenerator.tsx (772 lines)
- **Templates Gallery** - DocumentTemplatesPage.tsx
- **Workflow Integration** - generate_document action in workflow executor

### 📄 Files Created
- `src/lib/crmDocumentTemplates.tsx` (894 lines)
- `src/components/documents/CRMDocumentGenerator.tsx` (772 lines)
- `src/pages/DocumentTemplatesPage.tsx` (222 lines)

### 🎨 Tech
- @react-pdf/renderer voor PDF generation
- Dirq turquoise styling (#0ea5e9)
- Dutch date formatting (date-fns)
- Supabase storage integration

---

## [0.8.5] - 2026-01-06 - Interactions Module

### ✨ Added
- **Interactions Page** - InteractionsPage.tsx met filters en timeline
- **Task Management** - Status tracking, due dates, bulk actions
- **Quick Actions** - 📞 Gesprek, 📧 E-mail buttons
- **Company Selector** - Global interaction logging
- **Timeline Integration** - ContactDetailPage interaction history

### 📄 Files Created/Updated
- `src/pages/InteractionsPage.tsx`
- `src/features/contacts/pages/ContactDetailPage.tsx`
- `src/hooks/useUpdateInteraction.ts`
- `src/hooks/useDeleteInteraction.ts`

---

## [0.8.0] - 2026-01-06 - Mobile UX Optimization

### ✨ Added
- **Mobile Bottom Navigation** - 5 main routes met safe areas
- **Swipeable Cards** - Companies/Contacts met call/edit actions
- **Touch Optimization** - Minimum 44x44px touch targets
- **Keyboard Optimization** - inputMode attributes (tel, email, url)
- **Kanban Scroll Snapping** - Touch-friendly project pipeline
- **Sticky Action Bars** - Op detail pages
- **Horizontal Tabs** - Scrollable tab navigation

### 🎨 UI Improvements
- Pull-to-refresh functionality
- Touch-friendly charts (Recharts)
- Mobile-optimized forms
- Safe area handling (iOS notch)

---

## [0.7.5] - 2026-01-06 - Performance Optimization

### ⚡ Performance
- **Bundle Size Reduction** - 3MB → 739KB (75% kleiner)
- **Lazy Loading** - Alle dashboards en utility pages
- **Instant Transitions** - Removed animations
- **App.css Cleanup** - Full-screen layout optimization
- **Netlify Cache Headers** - Configured voor assets

### 📊 Metrics
- Initial bundle: 739KB gzipped
- Lazy chunks: 50-200KB each
- First Contentful Paint: <1.5s
- Lighthouse Score: 90+

---

## [0.7.0] - 2026-01-06 - Database Fixes

### 🐛 Fixed
- **Foreign Key Constraints** - Added missing constraints op projects, quotes
- **400 Database Errors** - Fixed all query syntax errors
- **Month-over-Month Trends** - Real calculations (geen mock data)
- **Contact Company Linking** - Fixed relationship queries
- **PWA Warnings** - Cleared all manifest warnings

### 🗃️ Database
```sql
20260106_add_missing_foreign_keys.sql  -- projects.company_id, quotes.company_id FKs
```

---

## [0.6.5] - 2026-01-05 - CSV Import/Export

### ✨ Added
- **CSV Import System** - Generic CSVImportDialog component (470 lines)
  - 5-step wizard (upload, mapping, preview, import, summary)
  - Auto-mapping based on headers
  - Required vs optional field differentiation
  - Error handling per row
- **Companies Import** - Bulk insert met owner_id assignment
- **Contacts Import** - Company lookup, boolean conversion
- **CSV Export** - 4 modules (Companies, Contacts, Quotes, Projects)
  - UTF-8 BOM voor Excel compatibiliteit
  - Filter-aware exports
  - Dutch date formatting

### 📦 Dependencies
- papaparse: ^5.4.1
- @types/papaparse: ^5.2.7

---

## [0.6.0] - 2026-01-05 - CRM Notifications

### ✨ Added
- **10 CRM Notification Types**
  - quote_accepted, quote_rejected, quote_expiring
  - lead_assigned, project_stage_changed
  - deal_won, deal_lost
  - follow_up_reminder
  - contact_created, company_created
- **Notification Helpers** - crmNotifications.ts (200 lines)
  - notifyQuoteAccepted, notifyLeadAssigned, notifyDealWon, etc.
- **Notification Bell** - NotificationBell component met real-time updates

---

## [0.5.5] - 2026-01-04 - Quote Detail Page

### ✨ Added
- **QuoteDetailPage** - Full quote view met line items
- **PDF Export** - Professional quote documents (react-pdf/renderer)
- **Status Workflow** - draft → sent → accepted/declined
- **Quote Calculations** - Subtotal, BTW (21%), total
- **Activity Timeline** - Quote-related interactions
- **Company/Contact Integration** - Linked relationships

### 📄 Files Created
- `src/pages/QuoteDetailPage.tsx`
- `src/lib/quotePdfGenerator.tsx`

---

## [0.5.0] - 2026-01-04 - Workflow Engine

### ✨ Added
- **Workflow Executor** - workflow/executor.ts
  - Trigger types: lead_created, quote_sent, project_stage_changed
  - Actions: send_notification, create_task, assign_user, update_field
  - Condition evaluation (field comparisons)
- **Lead Conversion Workflow** - Auto-assign, notification, task creation
- **Quote Approval Workflow** - Manager review process
- **Stage Change Automation** - Auto-tasks bij pipeline transitions

---

## [0.4.0] - 2026-01-03 - Core CRM Features

### ✨ Added
- **Companies Module** - List, detail, create, edit, delete
- **Contacts Module** - List, detail, create, edit, delete
- **Projects Module** - Kanban pipeline (10 stages)
- **Quotes Module** - List view met filtering
- **Dashboards** - Executive, Analytics, Super Admin
- **RBAC** - super_admin, ADMIN, MANAGER, SALES, SUPPORT

### 🗃️ Database Schema
```sql
20260103_crm_core_schema.sql      -- Core tables (companies, contacts, leads, interactions)
20260103_crm_rls_policies.sql     -- RLS policies voor alle rollen
20260103_transform_roles.sql       -- HR roles → CRM roles mapping
```

### 📊 Tables Created
- industries (10 seeded)
- companies (hoofdentiteit)
- contacts (met company relaties)
- leads (pipeline stages)
- interactions (activity logging)
- quotes (met line items)
- projects (10-stage pipeline)

### 🔐 Security
- RLS policies op alle tabellen
- Helper functions: `get_user_role()`, `is_admin_or_manager()`, `is_sales_or_above()`
- Audit logging: `crm_audit_log` tabel
- Role-based visibility (SALES = own data, ADMIN = all data)

---

## [0.3.0] - 2026-01-03 - Base Setup

### ✨ Added
- **Project Setup** - Vite + React + TypeScript
- **UI Framework** - shadcn/ui + Tailwind CSS
- **State Management** - React Query (TanStack Query)
- **Backend** - Supabase (PostgreSQL + Auth + Storage)
- **Routing** - React Router v6
- **Forms** - React Hook Form + Zod validation

### 📦 Dependencies
- react: ^18.3.1
- typescript: ^5.7.2
- vite: ^6.0.3
- @tanstack/react-query: ^5.62.14
- @supabase/supabase-js: ^2.48.1
- tailwindcss: ^3.4.17
- react-hook-form: ^7.54.2
- zod: ^3.24.1

### 🎨 Design System
- Primary color: Teal (#0ea5e9)
- Typography: Inter font
- Dark mode support
- Responsive breakpoints (mobile-first)

---

## [0.2.0] - 2026-01-02 - HR to CRM Transformation

### 🔄 Changed
- **Role Mapping** - HR roles → CRM roles
  - super_admin → ADMIN
  - hr → SALES
  - manager → MANAGER
  - medewerker → SUPPORT
- **Database Cleanup** - Removed HR-specific tables
- **UI Rebranding** - HR terminology → CRM terminology

---

## [0.1.0] - 2026-01-01 - Initial Setup

### ✨ Added
- Repository setup
- Base React app
- Supabase project creation
- Environment configuration
- Git repository initialization

---

## Migratie Overzicht

### Database Migrations (Chronologisch)
```
20260103_crm_core_schema.sql                   -- Core CRM tables
20260103_crm_rls_policies.sql                  -- RLS policies
20260103_transform_roles_to_crm.sql            -- Role transformatie
20260106_add_missing_foreign_keys.sql          -- FK constraints
20260107_fix_interactions_rls.sql              -- Interactions INSERT policy
20260107_fix_interactions_select_policy.sql    -- Interactions SELECT policy
20260107_fix_is_admin_function.sql             -- super_admin recognition
20260107_fix_audit_trigger_func.sql            -- Audit log fixes
20260107_create_calendar_events.sql            -- Calendar events tabel
20260107_google_calendar_sync.sql              -- Google Calendar integration
```

### Totaal: 10 migraties

---

**Changelog Format:** [Keep a Changelog](https://keepachangelog.com/)  
**Versioning:** [Semantic Versioning](https://semver.org/)  
**Last Updated:** 7 Januari 2026

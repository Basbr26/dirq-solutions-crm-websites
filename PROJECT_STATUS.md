# Verzuimbeheer Applicatie - Project Status

## 📋 Projectdoel

Een complete verzuimbeheer applicatie voor het bijhouden en beheren van ziekteverzuim volgens de **Wet Poortwachter**. De applicatie ondersteunt HR, managers en medewerkers bij het hele verzuimproces, van ziekmelding tot re-integratie.

## ✅ Geïmplementeerde Functionaliteiten

### 1. HR Dashboard (`/dashboard/hr`)
- **Overzicht van alle verzuimcases**
  - Zoekfunctionaliteit op naam en reden
  - Filteropties op status (actief, herstel, afgesloten)
  - Real-time statistieken (totaal, actief, herstel, afgesloten)
  - Sorteerbare case cards met details

- **Ziekmelding Aanmaken**
  - Dialog voor nieuwe ziekmelding registratie
  - Automatische preview van te genereren taken volgens Wet Poortwachter
  - Validatie van verplichte velden
  - Automatische taakgeneratie bij aanmaken

- **Analyse & Rapportage Tab**
  - Verzuim statistieken dashboard
  - Grafieken voor statusverdeling (pie chart)
  - Maandelijkse verzuimtrend (line chart)
  - Gemiddelde verzuimduur per status (bar chart)
  - Top verzuimredenen (bar chart)

- **Export Functionaliteit**
  - CSV export van alle cases
  - CSV export van alle taken
  - Datum en tijd in bestandsnaam

### 2. Case Detail Pagina (`/case/:id`)
**Tabs-gebaseerde interface:**

#### Tab: Overzicht
- Case informatie (medewerker, periode, reden, status)
- Editable notitieveld met opslaan functionaliteit
- Status wijziging dropdown (actief → herstel → afgesloten)
- Badge voor huidige status

#### Tab: Taken
- **Wet Poortwachter Informatie**
  - Uitleg over de wet en verplichtingen
  - Overzicht van automatische taken
  - Belangrijke mijlpalen met deadlines
  
- **Takenlijst**
  - Overzicht van alle taken voor de case
  - Status badges (open, in_progress, completed)
  - Deadline weergave met urgentie indicatie
  - Taak details met beschrijving
  - Status wijziging per taak

- **Nieuwe Taak Aanmaken**
  - Dialog met formulier voor custom taken
  - **Dropdown met Wet Poortwachter templates**
  - Pre-fill functionaliteit vanuit templates
  - Deadline automatisch berekend op basis van template

#### Tab: Timeline
- Chronologische weergave van events
- Event types: ziekmelding, gesprek, herstel, afmelding, notitie
- Datum en tijd per event
- Wie heeft event aangemaakt

#### Tab: Documenten
- **Document Upload**
  - Drag & drop functionaliteit
  - File size validatie (max 10MB)
  - Categorie selectie (medisch, correspondentie, re-integratie, overig)
  - Toegestane bestandstypes: PDF, Word, Excel, afbeeldingen
  
- **Documentenlijst**
  - Overzicht van alle documenten per case
  - Categorie badges met kleuren
  - Bestandsgrootte en upload datum
  - Preview, download en verwijder acties

### 3. Wet Poortwachter Integratie
**Automatische Taakgeneratie** (`src/lib/taskTemplates.ts`):
1. Eerste contact met medewerker (binnen 1 dag)
2. Manager informeren (binnen 1 dag)
3. Arbo-arts raadplegen (binnen 7 dagen)
4. Probleemanalyse uitvoeren (binnen 14 dagen)
5. Plan van aanpak opstellen (binnen 21 dagen)
6. Eerste evaluatiegesprek (binnen 42 dagen)

**Template Dropdown** in Task Dialog:
- Selecteer uit standaard Wet Poortwachter taken
- Automatisch invullen van titel, beschrijving en deadline
- Of maak custom taak aan

### 4. Componenten Structuur
```
src/
├── components/
│   ├── AnalyticsDashboard.tsx       # Charts en statistieken
│   ├── CaseCard.tsx                  # Case overzicht card
│   ├── DashboardHeader.tsx           # Header met navigatie
│   ├── DocumentList.tsx              # Documenten overzicht
│   ├── DocumentUpload.tsx            # Document upload widget
│   ├── NavLink.tsx                   # Navigatie links
│   ├── ProtectedRoute.tsx            # Auth route wrapper met role-based redirect
│   ├── RoleGate.tsx                  # ✅ Conditional rendering op basis van rol
│   ├── TaskDialog.tsx                # Taak aanmaken/bewerken
│   ├── WetPoortwachterInfo.tsx       # Wet info component
│   └── ZiekmeldingDialog.tsx         # Ziekmelding aanmaken
├── pages/
│   ├── Auth.tsx                      # Login/signup pagina met Supabase
│   ├── CaseDetail.tsx                # Case detail met tabs
│   ├── DashboardHR.tsx               # HR dashboard (compleet)
│   ├── DashboardManager.tsx          # Manager dashboard (UI klaar, data fetching TODO)
│   └── DashboardMedewerker.tsx       # Medewerker dashboard (UI klaar, data fetching TODO)
├── hooks/
│   └── useAuth.tsx                   # ✅ Supabase auth hook met role management
├── lib/
│   ├── exportUtils.ts                # CSV export functies
│   ├── mockData.ts                   # Mock data voor development
│   ├── supabase.ts                   # Supabase client configuratie
│   ├── supabaseHelpers.ts            # ✅ Helper functies voor CRUD operations
│   └── taskTemplates.ts              # Wet Poortwachter templates
└── types/
    └── sickLeave.ts                  # TypeScript types
```

### 5. Data Structuur
```typescript
// Types (src/types/sickLeave.ts)
- SickLeaveCase: verzuimcase met medewerker info
- Task: taken met status en deadline
- TimelineEvent: chronologische events
- Document: documenten met categorie
- CaseStatus: 'actief' | 'herstel' | 'afgesloten'
- TaskStatus: 'open' | 'in_progress' | 'completed'
- AppRole: 'hr' | 'manager' | 'medewerker'
```

### 6. UI/UX Features
- Responsive design (desktop & mobile)
- Dark/Light mode support via semantic tokens
- Toast notificaties bij acties
- Loading states en skeletons
- Form validatie met error messages
- Confirmation dialogs voor destructive actions
- Breadcrumb navigatie
- Status badges met kleurcoding

## 🔨 Nog Te Bouwen

### Prioriteit 1: Backend & Persistentie
- [ ] **Lovable Cloud activeren**
  - Database voor persistente data opslag
  - Authenticatie systeem (email/password)
  - File storage voor documenten
  
- [ ] **Database Schema & RLS Policies**
  - Tabellen: cases, tasks, timeline_events, documents, profiles
  - Row Level Security policies per rol
  - Database functies voor berekeningen

- [ ] **Supabase Storage Bucket**
  - Document upload naar Supabase Storage
  - Secure URLs voor downloads
  - File type en size validatie server-side

### Prioriteit 2: Authenticatie & Autorisatie ✅ FRONTEND KLAAR
- [x] **Auth Systeem (Frontend)**
  - ✅ Login/logout functionaliteit via `useAuth` hook
  - ✅ User registratie met email/password
  - ✅ Password reset flow (Supabase magic link)
  - ✅ Session management met auto-refresh
  - ⏳ **Vereist:** Supabase setup met Auth enabled
  
- [x] **Role-Based Access Control (RBAC) (Frontend)**
  - ✅ HR: volledige toegang tot alle cases
  - ✅ Manager: toegang tot eigen team cases (via `getManagerCases()`)
  - ✅ Medewerker: alleen eigen cases (via `getEmployeeCase()`)
  - ✅ `RoleGate` component voor conditional rendering
  - ⏳ **Vereist:** RLS policies in database (zie `SUPABASE_SETUP.md`)
  
- [x] **Protected Routes (Frontend)**
  - ✅ Redirect naar `/auth` als niet ingelogd
  - ✅ Role-based route protection in `ProtectedRoute.tsx`
  - ✅ Automatic redirect naar correct dashboard per rol
  - ✅ Unauthorized access handling (403 redirect)

### Prioriteit 3: Notificaties & Alerts
- [ ] **In-App Notificaties**
  - Toast notificaties bij belangrijke events
  - Notificatie centrum/dropdown
  - Badge met aantal ongelezen notificaties
  - Mark as read functionaliteit
  
- [ ] **Deadline Warnings**
  - Automatische alerts 3 dagen voor deadline
  - Overzicht van naderende deadlines
  - Visuele urgentie indicatie (rood voor urgent)
  
- [ ] **Status Change Notifications**
  - Notificaties bij case status wijziging
  - Notificaties bij taak toewijzing
  - Notificaties bij nieuwe documenten

### Prioriteit 4: Email Notificaties
- [ ] **Edge Function voor Emails**
  - Email service integratie (Resend/SendGrid)
  - Email templates voor verschillende events
  - Scheduled emails voor deadlines
  
- [ ] **Email Types**
  - Nieuwe ziekmelding → Manager & HR
  - Taak toegewezen → Verantwoordelijke
  - Deadline nadert → Verantwoordelijke
  - Status wijziging → Alle betrokkenen
  - Weekoverzicht → HR met open taken

### Prioriteit 5: Manager Dashboard (UI KLAAR)
- [ ] **Manager Specifieke Features**
  - ✅ UI klaar in `DashboardManager.tsx`
  - ✅ `getManagerCases()` helper beschikbaar
  - ✅ `getManagerTasks()` helper beschikbaar
  - ⏳ Data fetching moet worden geïmplementeerd
  - ⏳ Overzicht van team verzuim
  - ⏳ Team verzuim statistieken
  - ⏳ Actiepunten voor manager (goedkeuringen, gesprekken)
  
- [ ] **Team Management**
  - ⏳ Lijst van teamleden
  - ⏳ Verzuimgeschiedenis per teamlid
  - ⏳ Gesprek planning functionaliteit

### Prioriteit 6: Medewerker Dashboard (UI KLAAR)
- [ ] **Medewerker View**
  - ✅ UI klaar in `DashboardMedewerker.tsx`
  - ✅ `getEmployeeCase()` helper beschikbaar
  - ✅ `getCaseDocuments()` helper beschikbaar
  - ✅ `getCaseTimeline()` helper beschikbaar
  - ⏳ Data fetching moet worden geïmplementeerd
  - ⏳ Status van eigen re-integratie traject
  - ⏳ Upload eigen documenten (Storage integratie)
  - ⏳ Communicatie met HR/Manager
  
- [ ] **Self-Service**
  - ⏳ Eigen notities toevoegen
  - ⏳ Voortgang inzien
  - ⏳ Gesprek afspraken bekijken
  - ⏳ Documenten delen met HR

### Prioriteit 7: Advanced Features
- [ ] **Wet Poortwachter Compliance Dashboard**
  - KPI's: percentage taken op tijd
  - Gemiddelde responstijd eerste contact
  - Overzicht kritieke deadlines per case
  - Compliance score per case
  - Waarschuwingen bij afwijkingen
  
- [ ] **Advanced Analytics**
  - Verzuimtrends over langere periode
  - Predictive analytics voor verzuim
  - Departement vergelijkingen
  - ROI berekening re-integratie programma's
  
- [ ] **Calendar Integration**
  - Agenda met gesprekken en deadlines
  - iCal export functionaliteit
  - Outlook/Google Calendar sync
  
- [ ] **Bulk Actions**
  - Meerdere cases tegelijk exporteren
  - Bulk status updates
  - Bulk taak toewijzing
  
- [ ] **Advanced Search & Filters**
  - Full-text search in notities en documenten
  - Geavanceerde filters (datum range, multiple statuses)
  - Saved filter presets
  - Recent searches

### Prioriteit 8: UX Improvements
- [ ] **Onboarding Flow**
  - Tutorial voor nieuwe gebruikers
  - Feature highlights
  - Interactive guide
  
- [ ] **Keyboard Shortcuts**
  - Sneltoetsen voor veelgebruikte acties
  - Keyboard navigation
  
- [ ] **Accessibility**
  - WCAG 2.1 AA compliance
  - Screen reader support
  - Keyboard navigation
  - Focus management

## 🎯 Technische Verbeteringen
- [ ] **Error Handling**
  - Centralized error handling
  - User-friendly error messages
  - Error logging/monitoring
  
- [ ] **Performance Optimization**
  - Lazy loading van componenten
  - Virtualized lists voor grote datasets
  - Image optimization
  - Code splitting
  
- [ ] **Testing**
  - Unit tests voor utilities
  - Integration tests voor flows
  - E2E tests voor critical paths
  
- [ ] **Documentation**
  - API documentation
  - Component Storybook
  - User manual/help section

## 🚀 Deployment Checklist
- [ ] Environment variables setup
- [ ] Database migrations
- [ ] RLS policies verified
- [ ] Storage buckets configured
- [ ] Edge functions deployed
- [ ] Custom domain connected
- [ ] SSL certificate active
- [ ] Error monitoring setup
- [ ] Analytics setup
- [ ] Backup strategy

## 📊 Huidige Status

### ✅ FASE 1: Frontend UI - COMPLEET
- ✅ Alle dashboards (HR, Manager, Medewerker) UI gebouwd
- ✅ Case detail pagina met 4 tabs (Overzicht, Taken, Timeline, Documenten)
- ✅ Alle dialogs en forms (ZiekmeldingDialog, TaskDialog, etc.)
- ✅ Analytics dashboard met recharts
- ✅ Document management UI (upload, lijst, preview)
- ✅ Responsive design + dark/light mode
- ✅ Export functionaliteit (CSV)

### ✅ FASE 2: Authenticatie & Rollen - FRONTEND KLAAR
**Frontend Implementatie:**
- ✅ `useAuth.tsx` - Supabase auth hook met session management
- ✅ `ProtectedRoute.tsx` - Role-based route protection
- ✅ `RoleGate.tsx` - Conditional rendering component
- ✅ `Auth.tsx` - Login/signup pagina
- ✅ Role-based redirects (HR → `/dashboard/hr`, etc.)
- ✅ Auto-redirect naar correct dashboard na login

**Helper Functies in `supabaseHelpers.ts`:**
- ✅ `generateInitialTasks()` - Automatische taakgeneratie bij nieuwe case
- ✅ `calculateDeadline()` - Deadline berekening op basis van template
- ✅ `createTimelineEvent()` - Timeline event logging
- ✅ `getManagerCases()` - Cases voor manager's team
- ✅ `getManagerTasks()` - Taken voor manager
- ✅ `getEmployeeCase()` - Case voor specifieke medewerker
- ✅ `getCaseDocuments()` - Documenten per case
- ✅ `getCaseTimeline()` - Timeline events per case
- ✅ `updateTaskStatus()` - Taak status update
- ✅ `updateCaseStatus()` - Case status update

**⏳ Wat Jij Moet Doen (Backend Setup):**
1. **Supabase Project Setup:**
   - Voer alle SQL uit `SUPABASE_SETUP.md` uit:
     - Profiles tabel met role enum
     - Cases, tasks, timeline_events, documents tabellen
     - RLS policies voor HR/Manager/Medewerker
     - Database triggers voor auto-updates
     - Storage bucket voor documenten
   
2. **Environment Variables:**
   - Kopieer `.env.example` naar `.env`
   - Vul `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` in

3. **Test Gebruiker Aanmaken:**
   - Voer `create-test-user.sql` uit
   - Test login met verschillende rollen
   - Verifieer dat RLS policies werken

4. **Volg `IMPLEMENTATIE_CHECKLIST.md`:**
   - Stap-voor-stap verificatie
   - Test elke rol (HR, Manager, Medewerker)
   - Verifieer data toegang per rol

### 📋 Beschikbare Documentatie
- ✅ `SUPABASE_SETUP.md` - Volledige database schema + RLS policies
- ✅ `IMPLEMENTATIE_CHECKLIST.md` - Stap-voor-stap setup guide
- ✅ `PROJECT_STATUS.md` - Dit bestand
- ✅ `create-test-user.sql` - Test gebruikers SQL script
- ✅ `.env.example` - Environment variables template

### ⏳ FASE 3: Manager & Medewerker Dashboards - NA BACKEND SETUP
**Na jouw Supabase setup moet nog:**
- [ ] Manager dashboard: Implementeer data fetching met `getManagerCases()` en `getManagerTasks()`
- [ ] Medewerker dashboard: Implementeer data fetching met `getEmployeeCase()`
- [ ] Vervang mock data door echte Supabase queries
- [ ] Test filtering en permissions per rol

### ⏳ FASE 4: Automatisering Wet Poortwachter - NA BACKEND SETUP
**Na jouw Supabase setup moet nog:**
- [ ] Test automatische taakgeneratie bij nieuwe ziekmelding
- [ ] Verifieer deadline berekeningen
- [ ] Test timeline event tracking
- [ ] Verifieer dat RPC functie `generate_initial_tasks()` werkt

### 🎯 Toekomstige Features (Later)
- [ ] Document upload naar Supabase Storage (nu lokaal)
- [ ] In-app notificaties (toast + notificatie centrum)
- [ ] Email notificaties (edge functions + Resend/SendGrid)
- [ ] Deadline waarschuwingen (3 dagen voor deadline)
- [ ] Advanced analytics en compliance dashboard
- [ ] Calendar integratie (iCal export)
- [ ] Bulk actions (meerdere cases tegelijk)

### 📊 Voortgang Overzicht
- **Frontend:** 100% ✅ (Alle UI, components, routing klaar)
- **Auth & Roles (Frontend):** 100% ✅ (Wacht op backend setup)
- **Backend Setup:** 0% ⏳ (Jouw actie: voer SQL uit + .env configureren)
- **Data Integratie:** 0% ⏳ (Na backend setup: dashboard data fetching)
- **Advanced Features:** 0% ⏳ (Toekomst: notificaties, emails, etc.)

**Geschatte Totale Voortgang:** ~75% (frontend compleet, backend setup + data integratie vereist)

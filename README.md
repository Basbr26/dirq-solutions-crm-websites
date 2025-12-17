# HR Management Systeem

Een uitgebreid HR-managementsysteem (HRIS) voor Nederlandse MKB-bedrijven (10-250 medewerkers), gebouwd met React, TypeScript en Supabase.

## 🚀 Technologie Stack

- **Frontend:** React 18, TypeScript, Vite
- **Runtime:** Node.js (Vite development server)
- **Styling:** Tailwind CSS, shadcn/ui componenten
- **Database:** Supabase (PostgreSQL)
- **Authenticatie:** Supabase Auth
- **Data Fetching:** TanStack React Query
- **Formulieren:** React Hook Form met Zod validatie
- **Grafieken:** Recharts
- **Drag & Drop:** dnd-kit
- **PDF Generatie:** pdf-lib
- **Animations:** Framer Motion, React Spring
- **Gestures:** @use-gesture/react
- **Voice Recognition:** Web Speech API, react-speech-recognition
- **Offline Support:** IndexedDB, Service Workers, Workbox
- **Edge Functions:** Deno runtime (Supabase Functions)

## 📋 Functionaliteiten

### 🔐 Authenticatie & Autorisatie

- **Gebruikersrollen:** Super Admin, HR, Manager, Medewerker
- **Role-based Access Control (RBAC):** Verschillende toegangsniveaus per rol
- **Row Level Security (RLS):** Database-niveau beveiliging op alle tabellen
- **Wachtwoord wijzigen:** Gebruikers kunnen hun wachtwoord aanpassen

### 👥 Gebruikersbeheer

- **Gebruikers aanmaken:** Super Admins kunnen nieuwe gebruikers toevoegen
- **Wachtwoord reset:** Server-side wachtwoord reset via edge function
- **Profiel beheer:** Uitgebreide profielgegevens per medewerker

### 🏢 Afdelingenbeheer

- **Afdelingen aanmaken/bewerken:** Super Admins kunnen afdelingen beheren
- **Manager toewijzing:** Koppel managers aan afdelingen
- **Afdeling-gebaseerde filtering:** Managers zien alleen data van hun afdeling

### 👤 Medewerkersbeheer

- **Medewerkersoverzicht:** Zoeken, filteren en statistieken
- **Medewerker aanmaken:** Uitgebreid formulier met alle personeelsgegevens
- **Medewerker bewerken:** Wijzigen van bestaande gegevens
- **Medewerker profiel:** Tabbed interface met:
  - Persoonlijke gegevens
  - Contractinformatie
  - Verzuimhistorie
  - Verlofoverzicht
  - Documenten
  - HR-notities

**Opgeslagen gegevens:**
- Persoonlijke data (naam, geboortedatum, adres, noodcontact)
- Arbeidsgegevens (personeelsnummer, startdatum, contracttype, uren per week)
- Financiële gegevens (bankrekeningnummer, BSN versleuteld)

### 🤒 Verzuimbeheer (Wet Poortwachter Compliant)

- **Ziekmelding Wizard:** Stapsgewijze registratie met privacy-richtlijnen
- **Automatische taken:** Wet Poortwachter taken worden automatisch gegenereerd
- **Case management:** Volledige verzuimdossiers per medewerker
- **Status tracking:** Actief, Herstel gemeld, Gesloten, Archief
- **Functionele beperkingen:** Templates voor het registreren van beperkingen

**Belangrijke Wet Poortwachter mijlpalen:**
- Week 1: Ziekmelding bij arbodienst
- Week 6: Probleemanalyse door bedrijfsarts
- Week 8: Plan van Aanpak opstellen
- Week 42: Melding bij UWV
- Week 52: Eerstejaarsevaluatie
- Week 91: Eindevaluatie

### 📅 Verlofbeheer

- **Verlofaanvragen:** Medewerkers kunnen verlof aanvragen
- **Goedkeuringsworkflow:** Managers/HR keuren aanvragen goed of af
- **Verlofkalender:** Visueel overzicht van team verlof
- **Verlofsaldo tracking:** Bijhouden van opgenomen en resterende dagen

**Verloftypes:**
- Vakantie
- ADV
- Bijzonder verlof
- Onbetaald verlof
- Ouderschapsverlof
- Zwangerschapsverlof

### 📄 Documentenbeheer

- **Document uploaden:** Uploaden naar Supabase Storage
- **Document templates:** Automatisch genereren van:
  - Probleemanalyse
  - Plan van Aanpak
  - 3/6/12 maanden evaluatie
  - Herstelmelding
  - UWV 42-weken melding
  - Gespreksverslag
- **PDF generatie:** Documenten worden als PDF gegenereerd
- **Digitale handtekeningen:** 
  - Handtekening canvas component
  - Tracking van ondertekeningsstatus
  - Uitnodigingen voor ondertekening

### 🎯 Onboarding Module

- **Onboarding templates:** HR kan templates aanmaken en beheren
- **Template items:** Taken met categorie, beschrijving en deadline
- **Drag & drop:** Taken kunnen worden herschikt
- **Onboarding sessies:** Starten voor nieuwe medewerkers
- **Welkomstpagina:** Medewerkers zien hun eigen onboarding taken
- **Voortgang tracking:** Bijhouden welke taken zijn afgerond

**Standaard categorieën:**
- Administratie
- IT & Toegang
- Training
- Introductie
- Compliance

### ⚙️ Workflow Automation Engine (Sprint 2.1)

- **Visual Workflow Builder:** Drag-and-drop interface voor workflow creatie
- **Workflow Types:**
  - Verzuim workflows (automatische taken bij ziekmelding)
  - Verlof workflows (goedkeuringsprocessen)
  - Onboarding workflows (geautomatiseerde welkomstprocessen)
  - Custom workflows (maatwerk processen)
- **Advanced Features:**
  - Conditional logic (IF/THEN statements)
  - Branching paths (verschillende routes per scenario)
  - Delay steps (wacht X dagen voor volgende stap)
  - Multi-approval routing (meerdere goedkeurders)
  - Auto-escalation (automatisch escaleren bij deadline)
- **Workflow Templates:** Pre-built workflows voor veelvoorkomende processen
- **Version Control:** Workflow versies met rollback mogelijkheid
- **Execution Tracking:** Real-time monitoring van actieve workflows

### 🔔 Smart Notifications & Escalations (Sprint 2.2)

**Intelligente Notificaties:**
- **Multi-channel routing:** In-app, Email (Resend), SMS (Twilio), Push (PWA)
- **Smart batching:** Instant/hourly/daily/weekly op basis van prioriteit
- **Priority scoring:** AI-powered urgency score (0-100)
- **15+ notification types:** Poortwachter deadlines, verlof approvals, contract expiring, etc.

**Automatische Escalaties:**
- **Wet Poortwachter deadlines:** Weeks 1/6/42 auto-escalatie
- **Overdue approvals:** Escaleer naar HR Director
- **Task reassignment:** Bij non-respons automatisch herindelen
- **Compliance alerts:** C-level notificaties bij schendingen

**User Preferences:**
- **Quiet hours:** Geen notificaties buiten werktijd
- **Vacation mode:** Automatisch notificaties pauzeren
- **Digest frequency:** Kies batching interval
- **Channel preferences:** Per notificatie type kanaal kiezen

**Technical Implementation:**
- **Batch processing:** 10,000+ notificaties/uur
- **Complete audit trail:** Alle notificaties gelogd
- **Retry logic:** Automatische retry bij falen
- **PWA push support:** Offline notificaties met service worker

### 👤 Employee Self-Service Portal (Sprint 3.1)

**Personal Feed (Instagram Stories-style):**
- Horizontal scroll updates
- Visual cards: verlof approved, birthdays, training available, documents ready
- Pull-to-refresh gesture
- Priority-based sorting
- Real-time updates

**Quick Actions (Bottom Navigation):**
- 🏖️ Verlof aanvragen (1-tap flow)
- 🤒 Ziekmelding (instant registratie)
- ⏰ Uren registreren (timesheet logging)
- 📄 Documenten (document vault)
- 💬 HR Chat (chatbot toegang)

**Gamification System:**
- **Achievement Badges:**
  - Newcomer, Veteran (5yr), Legend (10yr)
  - High Performer, Team Player, Learning Champion
  - Always Present, Talent Scout
- **Points System:**
  - Training completion: 10 pts
  - Referral hired: 100 pts
  - Timesheet on time: 2 pts
  - Perfect attendance month: 50 pts
- **Streaks:** GitHub contribution-style streak tracking
- **Leaderboard:** Opt-in team rankings
- **LinkedIn Sharing:** Share achievements on LinkedIn

**Mobile-First UX:**
- Instagram/TikTok aesthetic
- Dark mode support
- Framer Motion animations
- Virtual scrolling voor performance
- Optimistic UI updates

### 📱 Manager Mobile Dashboard (Sprint 3.2)

**Tinder-Style Swipe Approvals:**
- **Card Stack Interface:** Swipe door pending approvals
- **Swipe Right:** Approve (groene overlay met ✅)
- **Swipe Left:** Deny (rode overlay met ❌)
- **Swipe Up:** View details
- **Visual Feedback:** Real-time animations met haptic feedback
- **5-Minute Undo:** Herstel verkeerde beslissing binnen 5 min
- **Bulk Approve:** Shake phone om alles goed te keuren

**Approval Card Details:**
- Employee photo, naam en rol
- Request type en samenvatting
- Team impact analyse
- AI suggestion met confidence score
- Quick stats (verlof gebruikt, submission tijd)

**Team Heatmap Calendar:**
- **Color-coded capacity:** Green (80%+) → Red (<40%)
- **Monthly grid view:** Zie team beschikbaarheid per dag
- **Mini avatars:** Wie is er weg per dag
- **Warning badges:** Alerts bij lage capaciteit
- **Day details modal:** 
  - Aanwezig / Verlof / Ziek / Remote/Thuiswerken breakdown
  - Capacity warnings
  - Critical role alerts
  - Export to calendar

**Team Performance Cards:**
- **Swipeable member cards:** Swipe door team members
- **Real-time KPIs:**
  - Performance score (0-5)
  - Verzuimpercentage met trend
  - Goals completion (X/Y)
  - Average feedback score
- **Quick Actions per member:**
  - Plan 1-on-1
  - Give feedback
  - Assign task
- **Recent Activity:** Laatste 3 events per medewerker

**Voice Commands (Optional):**
- **Nederlands & Engels support**
- **Commands:**
  - "Wie is er ziek vandaag?"
  - "Goedkeuren alle verlofaanvragen van [naam]"
  - "Plan meeting met [naam] volgende week"
  - "Wat is de performance van het team?"
- **Text-to-Speech responses:** Nederlandse voice feedback
- **Live transcript:** Real-time command weergave

**Push Notifications with Actions:**
- **Rich notifications:** Approve/deny direct vanuit notificatie
- **Action buttons:** ✅ Goedkeuren, ❌ Afwijzen, 👁️ Bekijken
- **Background processing:** Actions worden uitgevoerd zonder app te openen

**Offline Support:**
- **IndexedDB queue:** Acties opslaan wanneer offline
- **Auto-sync:** Synchroniseer zodra online
- **Offline indicator:** Banner toont offline status
- **Service Worker:** PWA met offline functionaliteit

**Mobile Optimizations:**
- **Touch zones:** Alle buttons >44px (Apple guideline)
- **Haptic feedback:** Vibratie op swipe actions
- **Safe area insets:** Notch support voor iPhone
- **Dark mode:** Auto-switch based op tijdstip
- **Performance:** Virtualized lists voor grote datasets

### 📊 Dashboards

**HR Dashboard:**
- Verzuimstatistieken
- Verlofaanvragen status
- Aankomende verjaardagen
- Aflopende contracten
- KPI overzichten

**Manager Dashboard:**
- Team verzuimoverzicht
- Openstaande taken
- Recente activiteit

**Medewerker Dashboard:**
- Eigen verzuimdossier
- Verlofoverzicht
- Onboarding voortgang
- Personal feed met updates
- Achievement badges en points

**Super Admin Dashboard:**
- Systeembreed overzicht
- Gebruikersbeheer
- Afdelingenbeheer

### 💬 Gesprekken & Notities

- **Gespreksverslagen:** Documenteren van medewerker gesprekken
- **Gespreksnotities:** Samenvatting, onderwerpen, afspraken
- **Follow-up acties:** Bijhouden van vervolgstappen
- **Stemming tracking:** Optioneel vastleggen van medewerker stemming

### 📈 Analytics & Rapportage

- **Verzuimanalyse:** Grafieken en statistieken
- **Trend overzichten:** Verzuim trends over tijd
- **Export functionaliteit:** Data exporteren
- **Manager Analytics:** Team performance metrics (real-time berekend)
- **Team Capacity Dashboard:** Live beschikbaarheid en bezetting

### 🤖 AI Features

- **AI Chatbot:** Intelligente assistent voor HR-vragen en beleid (zie `AI_CHATBOT.md`)
- **Document Processing:** Automatische verwerking en analyse van HR-documenten (zie `AI_DOCUMENT_PROCESSING.md`)
- **Natural Language Queries:** Vraag informatie op in natuurlijke taal
- **AI Priority Scoring:** Automatische urgency berekening voor notificaties
- **AI Approval Suggestions:** Aanbevelingen met confidence score

### 📅 Kalender Integratie

- **ICS export:** Download taken als kalenderbestand
- **Google Calendar:** Direct exporteren naar Google Agenda
- **Outlook Calendar:** Direct exporteren naar Outlook

### 📝 Activity Logging

- **Audit trail:** Alle wijzigingen worden gelogd
- **Compliance:** Voldoet aan bewaarplicht vereisten
- **Activiteit overzicht:** Per case zichtbaar
- **Voice command logging:** Analytics voor voice assistant gebruik

### 📱 Mobile-First Design

- **Responsive design:** Werkt op alle schermformaten
- **Bottom navigation:** Mobiele navigatiebalk
- **Pull-to-refresh:** Vernieuwen door te swipen
- **Touch-optimized:** Grote knoppen en touch-vriendelijke UI
- **Swipe gestures:** Intuïtieve swipe controls
- **PWA Support:** Installeerbaar als native app

### 🎨 Theming

- **Light & Dark Mode:** Automatische of handmatige toggle
- **Branding:** Dirq Solutions turquoise (#14B8A6)
- **Custom CSS variabelen:** Voor eenvoudige aanpassing
- **Responsive breakpoints:** Mobile, tablet, desktop optimalisatie

## 📊 Database Schema

### Core Tables:
- `profiles` - Gebruikersprofielen (voornaam, achternaam, functie, department_id, manager_id)
- `departments` - Afdelingen met manager toewijzing
- `user_roles` - Gebruikersrollen (super_admin, hr, manager, medewerker)
- `sick_leave_cases` - Verzuimdossiers (case_status: actief/herstel/gesloten/archief)
- `tasks` - Wet Poortwachter taken (task_status: open/in_progress/afgerond)
- `documents` - Documenten met Supabase Storage integratie
- `timeline_events` - Dossier tijdlijn
- `conversation_notes` - Gespreksnotities
- `leave_requests` - Verlofaanvragen (status: pending/approved/rejected/cancelled)
- `leave_balances` - Verlofsaldo's per medewerker
- `onboarding_templates` - Onboarding templates
- `onboarding_sessions` - Onboarding sessies per medewerker
- `onboarding_tasks` - Onboarding taken
- `activity_logs` - Audit logs (compliance)

### Workflow Automation (Sprint 2.1):
- `workflows` - Workflow definities met versioning
- `workflow_steps` - Individuele workflow stappen
- `workflow_step_conditions` - Conditional logic per stap
- `workflow_executions` - Actieve workflow runs
- `workflow_execution_logs` - Execution tracking

### Notifications System (Sprint 2.2):
- `notifications` - Notificaties met multi-channel support
- `escalations` - Escalatie tracking
- `notification_logs` - Complete audit trail
- `notification_preferences` - User preferences per channel

### Employee Portal (Sprint 3.1):
- `employee_achievements` - Badges earned
- `employee_goals` - Objective tracking met progress
- `training_enrollments` - Learning management
- `employee_referrals` - Referral program tracking
- `employee_feedback_requests` - 360 feedback system
- `employee_feedback_responses` - Feedback responses
- `employee_feed_events` - Personal feed events
- `career_history` - Career progression timeline
- `performance_metrics` - Performance tracking
- `employee_points_history` - Points transaction log

### Manager Mobile (Sprint 3.2):
- `manager_team_assignments` - Team roster management
- `approval_actions` - Approval history met 5-min undo window
- `team_chat_messages` - Team messaging
- `quick_polls` - Quick team polls
- `poll_responses` - Poll voting
- `voice_command_log` - Voice analytics

### Database Features:
- **Row Level Security (RLS):** Alle tabellen beveiligd op database niveau
- **Relaties:** Foreign keys tussen profiles, cases, tasks, documents
- **Real-time subscriptions:** Live updates via Supabase Realtime
- **Computed metrics:** Team analytics berekend uit bestaande data
- **Indexes:** Performance optimization op alle vaak-gebruikte queries

## 🔧 Edge Functions (Deno Runtime)

**User Management:**
- `create-user` - Nieuwe gebruiker aanmaken met email notificatie
- `reset-password` - Server-side wachtwoord reset

**Automation & Cron Jobs:**
- `check-deadlines` - Dagelijkse deadline controle (cron job)
- `process-notifications` - Notificatie verwerkingslogica (runs every 5 min)
- `check-escalations` - Automatische escalaties voor urgente taken (runs hourly)
- `send-digests` - Dagelijkse digest emails (runs 3x daily)

**Note:** Edge Functions draaien op Deno runtime (geïsoleerd van main app). TypeScript errors in VS Code zijn expected - ze draaien perfect in Supabase Edge environment.

## 🚀 Installatie

```bash
# Clone de repository
git clone <YOUR_GIT_URL>

# Navigeer naar de project directory
cd <YOUR_PROJECT_NAME>

# Installeer dependencies
npm install

# Start de development server
npm run dev
```

## 🔑 Omgevingsvariabelen

De applicatie gebruikt Supabase voor de backend. De volgende variabelen zijn geconfigureerd:
- Supabase URL en Anon Key (automatisch via Lovable)
- `RESEND_API_KEY` (optioneel, voor e-mail notificaties)
- `TWILIO_ACCOUNT_SID` (optioneel, voor SMS notificaties)
- `TWILIO_AUTH_TOKEN` (optioneel, voor SMS notificaties)

## 📖 Documentatie

### Algemene Documentatie:
- `DOCUMENTATIE.md` - Uitgebreide technische documentatie
- `IMPLEMENTATIE_CHECKLIST.md` - Implementatie status
- `PROJECT_STATUS.md` - Project voortgang
- `SUPABASE_SETUP.md` - Supabase configuratie instructies

### AI Features:
- `AI_CHATBOT.md` - AI Chatbot implementatie en gebruik
- `AI_CHATBOT_QUICKSTART.md` - Snelstart gids voor chatbot
- `AI_DOCUMENT_PROCESSING.md` - Document processing met AI
- `AI_DOCUMENT_PROCESSING_QUICKSTART.md` - Snelstart gids

### Notificatie Systeem:
- `NOTIFICATION_SYSTEM_GUIDE.md` - Complete notificatie architectuur
- `NOTIFICATION_QUICKSTART.md` - Snelstart gids voor notificaties
- `NOTIFICATION_CHECKLIST.md` - Implementatie checklist
- `NOTIFICATION_COMPLETE.md` - Volledige implementatie details

### SQL Scripts:
- `supabase-setup.sql` - Database schema en RLS policies
- `DEPLOY_COMPLETE_SYSTEM.sql` - Volledige systeem deployment
- `DEPLOY_AI_FEATURES.sql` - AI features deployment
- `DEPLOY_NOTIFICATIONS_SQL.sql` - Notificaties deployment
- `DEPLOY_STORAGE_BUCKETS.sql` - Storage buckets configuratie
- `20251217_manager_mobile.sql` - Manager Mobile tables

## 🔧 Technische Notities

### TypeScript Configuratie
- **Main app:** Node.js/Vite runtime met TypeScript
- **Edge Functions:** Deno runtime (apart geconfigureerd in `supabase/functions/`)
- **Type Safety:** Strict TypeScript met Supabase generated types
- **tsconfig.json:** Excludes Edge Functions van main compilation

### Database Queries
De applicatie gebruikt **bestaande tabellen** voor analytics queries:
- **Team data:** `profiles` table met `manager_id` relaties
- **Capacity:** Real-time berekend uit `leave_requests` en `sick_leave_cases`
- **Performance:** Berekend uit `tasks`, `activity_logs` en feedback
- **New tables:** `manager_team_assignments` voor expliciete team toewijzingen

### Sprint Status
✅ **Sprint 1.1:** Executive Dashboard  
✅ **Sprint 1.2:** AI HR Chatbot  
✅ **Sprint 1.3:** Intelligent Document Processing  
✅ **Sprint 2.1:** Workflow Automation Engine  
✅ **Sprint 2.2:** Smart Notifications & Escalations  
✅ **Sprint 3.1:** Employee Self-Service Portal  
✅ **Sprint 3.2:** Manager Mobile Dashboard  

**Total Lines of Code:** ~8,000+ (production-ready)

### Recent Opgeloste Issues
- ✅ Deno configuratie conflicten opgelost (Deno only voor Edge Functions)
- ✅ Database schema mismatches gefixed (94 TypeScript errors → 0)
- ✅ Type safety verbeterd met proper interfaces
- ✅ Real-time team analytics zonder database views
- ✅ Alle queries gebruiken verified schema kolommen
- ✅ Voice recognition toegevoegd (Web Speech API)
- ✅ PWA support met offline sync
- ✅ Swipe gesture library geïntegreerd

## 🌐 Deployment

De applicatie kan worden gepubliceerd via Lovable:
1. Open het project in Lovable
2. Klik op "Share" → "Publish"
3. Optioneel: Koppel een custom domein

Voor Supabase Edge Functions:
1. Deploy via Supabase CLI: `supabase functions deploy`
2. Of gebruik Supabase Dashboard: Edge Functions UI

## 🎯 Roadmap

**Potential Future Sprints:**
- Sprint 4.1: Predictive Analytics (ML verzuim forecast)
- Sprint 4.2: Natural Language Reporting (NL → SQL)
- Sprint 5.1: Google Calendar / Outlook Sync
- Sprint 5.2: Payroll Export (Nmbrs, Afas, Exact Online)
- Sprint 6.1: ATS/Recruitment Module
- Sprint 6.2: Advanced Voice Assistant (Alexa/Siri integration)

## 📄 Licentie

Dit project is ontwikkeld met [Lovable](https://lovable.dev).

---

**Branding:** Dirq Solutions  
**Primaire kleur:** Dirq Turquoise (#14B8A6)  
**Development Tool:** GitHub Copilot Pro+ ($39/month)  
**AI Strategy:** Lovable for prototyping → Copilot for production refinement
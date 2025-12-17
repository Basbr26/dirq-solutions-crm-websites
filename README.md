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

**Super Admin Dashboard:**
- Systeembreed overzicht
- Gebruikersbeheer
- Afdelingenbeheer

### 💬 Gesprekken & Notities

- **Gespreksverslagen:** Documenteren van medewerker gesprekken
- **Gespreksnotities:** Samenvatting, onderwerpen, afspraken
- **Follow-up acties:** Bijhouden van vervolgstappen
- **Stemming tracking:** Optioneel vastleggen van medewerker stemming

### 🔔 Notificatiesysteem

**In-app notificaties:**
- Nieuwe ziekmelding (HR/Super Admin)
- Case status wijziging (alle betrokkenen)
- Taak toegewezen (medewerker)
- Taak afgerond (HR/Manager)
- Document vereist handtekening
- Document ondertekend

**E-mail notificaties (optioneel):**
- Via Resend integratie
- Dagelijkse deadline check via cron job

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

### 📅 Kalender Integratie

- **ICS export:** Download taken als kalenderbestand
- **Google Calendar:** Direct exporteren naar Google Agenda
- **Outlook Calendar:** Direct exporteren naar Outlook

### 📝 Activity Logging

- **Audit trail:** Alle wijzigingen worden gelogd
- **Compliance:** Voldoet aan bewaarplicht vereisten
- **Activiteit overzicht:** Per case zichtbaar

### 📱 Mobile-First Design

- **Responsive design:** Werkt op alle schermformaten
- **Bottom navigation:** Mobiele navigatiebalk
- **Pull-to-refresh:** Vernieuwen door te swipen
- **Touch-optimized:** Grote knoppen en touch-vriendelijke UI

### 🎨 Theming
 (voornaam, achternaam, functie, department_id, manager_id)
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
- `notifications` - Notificaties (in-app + email)
- `activity_logs` - Audit logs (compliance)

### Database Features:
- **Row Level Security (RLS):** Alle tabellen beveiligd op database niveau
- **Relaties:** Foreign keys tussen profiles, cases, tasks, documents
- **Real-time subscriptions:** Live updates via Supabase Realtime
- **Computed metrics:** Team analytics berekend uit bestaande data (geen aparte views)tijdlijn
- `conversation_notes` - Gespreksnotities
- `leave_requests` - Verlofaanvragen
- `leave_balances` - Verlofsaldo's
- `onboarding_templa (Deno Runtime)

- `create-user` - Nieuwe gebruiker aanmaken met email notificatie
- `reset-password` - Server-side wachtwoord reset
- `check-deadlines` - Dagelijkse deadline controle (cron job)
- `process-notifications` - Notificatie verwerkingslogica
- `check-escalations` - Automatische escalaties voor urgente taken
- `send-digests` - Dagelijkse digest emails

**Note:** Edge Functions draaien op Deno runtime (geïsoleerd van main app

## 🔧 Edge Functions

- `create-user` - Nieuwe gebruiker aanmaken
- `reset-password` - Wachtwoord resetten
- `check-deadlines` - Dagelijkse deadline controle (cron)

## 🚀 Installatie

```bash
# Clone de repository
git clone <YOUR_GIT_URL>

# Navigeer naar de project directory
cd <YOUR_PROJECT_NAME>

# Installeer dependencies
npm install

# Start de development server
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

## 🔧 Technische Notities

### TypeScript Configuratie
- **Main app:** Node.js/Vite runtime met TypeScript
- **Edge Functions:** Deno runtime (apart geconfigureerd in `supabase/functions/`)
- **Type Safety:** Strict TypeScript met Supabase generated types
- **tsconfig.json:** Excludes Edge Functions van main compilation

### Database Schema Beperkingen
De applicatie gebruikt **bestaande tabellen** voor alle queries. Team analytics en performance metrics worden **real-time berekend** uit:
- `profiles` (team members via manager_id)
- `leave_requests` (approved requests voor capacity)
- `sick_leave_cases` (actieve verzuim voor beschikbaarheid)
- `tasks` (taak completion rates)
- `activity_logs` (gebruiker activiteit voor metrics)

Er zijn **geen aparte views** voor:
- ❌ `manager_team_assignments` (gebruikt `profiles.manager_id`)
- ❌ `team_daily_status` (berekend uit real-time queries)
- ❌ `performance_metrics` (berekend uit tasks/logs)

### Recent Opgeloste Issues
- ✅ Deno configuratie conflicten opgelost (Deno only voor Edge Functions)
- ✅ Database schema mismatches gefixed (94 TypeScript errors → 0)
- ✅ Type safety verbeterd met proper interfaces
- ✅ Real-time team analytics zonder database views
- ✅ Alle queries gebruiken verified schema kolommen
De applicatie gebruikt Supabase voor de backend. De volgende variabelen zijn geconfigureerd:
- Supabase URL en Anon Key (automatisch via Lovable)
- `RESEND_API_KEY` (optioneel, voor e-mail notificaties)

## 📖 Documentatie

Zie de volgende bestanden voor meer informatie:
- `DOCUMENTATIE.md` - Uitgebreide technische documentatie
- `IMPLEMENTATIE_CHECKLIST.md` - Implementatie status
- `PROJECT_STATUS.md` - Project voortgang
- `SUPABASE_SETUP.md` - Supabase configuratie instructies

## 🌐 Deployment

De applicatie kan worden gepubliceerd via Lovable:
1. Open het project in Lovable
2. Klik op "Share" → "Publish"
3. Optioneel: Koppel een custom domein

## 📄 Licentie

Dit project is ontwikkeld met [Lovable](https://lovable.dev).

---

**Branding:** Dirq Solutions  
**Primaire kleur:** Dirq Turquoise (#14B8A6)

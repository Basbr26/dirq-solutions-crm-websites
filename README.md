# HR Management Systeem

Een uitgebreid HR-managementsysteem (HRIS) voor Nederlandse MKB-bedrijven (10-250 medewerkers), gebouwd met React, TypeScript en Supabase.

## 🚀 Technologie Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui componenten
- **Database:** Supabase (PostgreSQL)
- **Authenticatie:** Supabase Auth
- **Data Fetching:** TanStack React Query
- **Formulieren:** React Hook Form met Zod validatie
- **Grafieken:** Recharts
- **Drag & Drop:** dnd-kit

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

- **Dark mode:** Schakel tussen licht en donker thema
- **Dirq Turquoise:** Primaire merkkleur (#14B8A6)
- **Consistent design system:** shadcn/ui componenten

## 🗄️ Database Schema

### Belangrijkste tabellen:
- `profiles` - Medewerkergegevens
- `departments` - Afdelingen
- `user_roles` - Gebruikersrollen
- `sick_leave_cases` - Verzuimdossiers
- `tasks` - Wet Poortwachter taken
- `documents` - Documenten
- `timeline_events` - Dossier tijdlijn
- `conversation_notes` - Gespreksnotities
- `leave_requests` - Verlofaanvragen
- `leave_balances` - Verlofsaldo's
- `onboarding_templates` - Onboarding templates
- `onboarding_sessions` - Onboarding sessies
- `onboarding_tasks` - Onboarding taken
- `notifications` - Notificaties
- `activity_logs` - Audit logs

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
npm run dev
```

## 🔑 Environment Variables

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

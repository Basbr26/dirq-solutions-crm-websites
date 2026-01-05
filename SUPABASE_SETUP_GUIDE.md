# 🚀 Supabase Setup Guide - CRM App

## Stap 1: Supabase Project Setup

### A. Nieuw Project Aanmaken
1. Ga naar [supabase.com/dashboard](https://supabase.com/dashboard)
2. Klik op "New Project"
3. Vul in:
   - **Name**: `DIRQ CRM`
   - **Database Password**: Genereer een sterk wachtwoord (bewaar dit veilig!)
   - **Region**: `West EU (Ireland)` (dichtstbij Nederland)
4. Klik "Create new project" en wacht tot klaar (~2 minuten)

### B. Project Credentials Ophalen
1. Ga naar **Project Settings** (tandwiel icoon)
2. Ga naar **API** tab
3. Kopieer:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJhbGc...`

## Stap 2: Environment Variables Instellen

### Lokaal (.env bestand)
Maak een `.env` bestand in de root van je project:

```env
VITE_SUPABASE_URL=https://jouw-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key-hier
```

### Netlify
1. Ga naar je Netlify site dashboard
2. **Site settings** → **Environment variables**
3. Voeg toe:
   - `VITE_SUPABASE_URL` = je project URL
   - `VITE_SUPABASE_ANON_KEY` = je anon key

## Stap 3: Database Migraties Uitvoeren

Je hebt 2 opties:

### Optie A: Via Supabase Dashboard (Makkelijkst)

1. Ga naar **SQL Editor** in je Supabase dashboard
2. Voer de migraties uit in deze volgorde:

#### Migration 1: Core Schema
```sql
-- Kopieer en plak de inhoud van:
supabase/migrations/20260103_crm_core_schema.sql
```
Klik "Run"

#### Migration 2: RLS Policies
```sql
-- Kopieer en plak de inhoud van:
supabase/migrations/20260103_crm_rls_policies.sql
```
Klik "Run"

#### Migration 3: Role Transform
```sql
-- Kopieer en plak de inhoud van:
supabase/migrations/20260103_transform_roles_to_crm.sql
```
Klik "Run"

#### Migration 4: Quotes & Projects
```sql
-- Kopieer en plak de inhoud van:
supabase/migrations/20260103_website_sales_crm.sql
```
Klik "Run"

### Optie B: Via Supabase CLI (Geavanceerd)

```bash
# Installeer Supabase CLI
npm install -g supabase

# Login bij Supabase
supabase login

# Link je project
supabase link --project-ref jouw-project-id

# Verwijder oude migraties eerst
rm supabase/migrations/!(20260103*)

# Push migraties naar Supabase
supabase db push
```

## Stap 4: Eerste Admin User Aanmaken

### Via SQL Editor:
```sql
-- 1. Maak een user aan via Authentication
-- Dit doe je in de Supabase Dashboard:
-- Authentication → Users → Add User
-- Email: jouw@email.com
-- Password: JouwWachtwoord123!

-- 2. Nadat je de user hebt aangemaakt, krijg je een User ID (UUID)
-- Kopieer deze en gebruik hem in onderstaande query:

-- 3. Maak een profile aan met ADMIN rol
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'USER_ID_HIER',  -- vervang met je user UUID
  'jouw@email.com',
  'Jouw Naam',
  'ADMIN',
  now(),
  now()
);
```

## Stap 5: Testen

### Lokaal Testen:
```bash
# Start dev server
npm run dev

# Navigeer naar http://localhost:5173
# Login met je admin credentials
```

### Controleer of het werkt:
1. ✅ Kun je inloggen?
2. ✅ Zie je het CRM Dashboard?
3. ✅ Kun je een bedrijf toevoegen?
4. ✅ Kun je een contact toevoegen?

## Stap 6: Netlify Deploy

Als alles lokaal werkt:
```bash
git add .
git commit -m "Add Supabase environment setup"
git push origin main
```

Netlify zal automatisch deployen met de environment variables die je hebt ingesteld.

## 🔧 Troubleshooting

### "Failed to fetch" errors
- Check of je `.env` bestand de juiste credentials heeft
- Controleer of Supabase project actief is
- Check Network tab in browser DevTools

### "RLS policy" errors
- Zorg dat alle 4 migraties succesvol zijn uitgevoerd
- Check Database → Policies in Supabase dashboard
- Elk table zou policies moeten hebben

### "User not found" bij login
- Maak profile aan met INSERT query hierboven
- Zorg dat user ID overeenkomt met auth.users ID

## 📚 Database Schema Overzicht

Na de migraties heb je:

### Core Tables:
- `profiles` - User profielen met CRM rollen (ADMIN, SALES, MANAGER, SUPPORT)
- `companies` - Bedrijven database
- `contacts` - Contactpersonen
- `industries` - Industrie categorieën

### Sales Tables:
- `quotes` - Offertes
- `quote_items` - Offerte regels
- `projects` - Projecten/deals in pipeline
- `project_templates` - Project templates

### Support Tables:
- `interactions` - Klant interacties
- `leads` - Lead tracking
- `crm_audit_log` - Audit trail

## 🎉 Klaar!

Je CRM app is nu volledig opgezet en klaar voor gebruik!

### Volgende Stappen:
1. Voeg meer users toe via Authentication
2. Importeer bestaande klanten data (CSV upload kan je later bouwen)
3. Pas branding aan (logo's, kleuren in tailwind.config.ts)
4. Stel Sentry DSN in voor error tracking (optioneel)

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

### Optie A: Via Supabase Dashboard (Makkelijkst) ⭐ AANBEVOLEN

1. Ga naar **SQL Editor** in je Supabase dashboard
2. Voer de migraties uit in deze **exacte volgorde**:

#### Migration 1: Core Schema (Basis CRM tabellen)
```sql
-- Kopieer en plak de inhoud van:
-- supabase/migrations/20260103_crm_core_schema.sql
-- Dit creëert: industries, companies, contacts, leads, interactions tabellen
```
Klik "Run" en wacht op "Success"

#### Migration 2: RLS Policies (Row Level Security)
```sql
-- Kopieer en plak de inhoud van:
-- supabase/migrations/20260103_crm_rls_policies.sql
-- Dit beveiligt alle tabellen met role-based access control
```
Klik "Run" en wacht op "Success"

#### Migration 3: Role Transform (CRM rollen)
```sql
-- Kopieer en plak de inhoud van:
-- supabase/migrations/20260103_transform_roles_to_crm.sql
-- Dit wijzigt HR rollen naar CRM rollen (ADMIN, SALES, MANAGER, SUPPORT)
```
Klik "Run" en wacht op "Success"

#### Migration 4: Quotes & Projects (Website Sales)
```sql
-- Kopieer en plak de inhoud van:
-- supabase/migrations/20260103_website_sales_crm.sql
-- Dit voegt quotes, quote_items, projects toe met pipeline stages
```
Klik "Run" en wacht op "Success"

#### Migration 5: Notification System
```sql
-- Kopieer en plak de inhoud van:
-- supabase/migrations/20260106_notification_system.sql
-- Dit creëert het notificatie systeem
```
Klik "Run" en wacht op "Success"

#### Migration 6: Storage Avatars
```sql
-- Kopieer en plak de inhoud van:
-- supabase/migrations/20260106_storage_avatars.sql
-- Dit creëert de avatars bucket voor profielfoto's
```
Klik "Run" en wacht op "Success"

#### Migration 7: Storage Documents ⭐ NIEUW
```sql
-- Kopieer en plak de inhoud van:
-- supabase/migrations/20260108_storage_documents.sql
-- Dit creëert de documents bucket en tabel voor CRM documenten
```
Klik "Run" en wacht op "Success"

### Verificatie
Na alle migrations, check of je deze tabellen hebt:
- ✅ `industries`
- ✅ `companies`
- ✅ `contacts`
- ✅ `leads`
- ✅ `interactions`
- ✅ `projects`
- ✅ `quotes`
- ✅ `quote_items`
- ✅ `notifications`
- ✅ `documents`

En deze buckets in Storage:
- ✅ `avatars`
- ✅ `documents`

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

---

## 📝 ALLE SQL MIGRATIONS (Copy-Paste Ready)

Voor je gemak staan hieronder alle SQL migrations volledig uitgeschreven.
Kopieer en plak deze in Supabase SQL Editor in de aangegeven volgorde.

### Migration 1: Core Schema (20260103_crm_core_schema.sql)

**BELANGRIJK:** Deze migration is zeer groot (340+ regels). 
Open het bestand `supabase/migrations/20260103_crm_core_schema.sql` en kopieer de volledige inhoud.

Dit creëert:
- ✅ industries tabel met 10 seeded industrieën
- ✅ companies tabel met JSONB velden
- ✅ contacts tabel met company relaties
- ✅ leads tabel met pipeline stages
- ✅ interactions tabel voor activity logging
- ✅ Alle triggers en indexes

---

### Migration 2: RLS Policies (20260103_crm_rls_policies.sql)

**BELANGRIJK:** Deze migration is zeer groot (340+ regels).
Open het bestand `supabase/migrations/20260103_crm_rls_policies.sql` en kopieer de volledige inhoud.

Dit creëert:
- ✅ Helper functies voor role checking
- ✅ RLS policies voor companies (ADMIN/MANAGER see all, SALES own only)
- ✅ RLS policies voor contacts (based on company ownership)
- ✅ RLS policies voor leads (own leads only for SALES)
- ✅ RLS policies voor interactions
- ✅ Audit log tabel en policies

---

### Migration 3: Role Transform (20260103_transform_roles_to_crm.sql)

```sql
-- Transform existing HR roles to CRM roles
-- This migration changes the role enum and updates existing users

-- Step 1: Create new role enum
DO $$ BEGIN
  CREATE TYPE app_role_new AS ENUM ('ADMIN', 'SALES', 'MANAGER', 'SUPPORT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add temporary column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rol_new app_role_new;

-- Step 3: Map old roles to new roles
UPDATE profiles SET rol_new = 
  CASE 
    WHEN rol::text = 'super_admin' THEN 'ADMIN'::app_role_new
    WHEN rol::text = 'hr' THEN 'MANAGER'::app_role_new
    WHEN rol::text = 'medewerker' THEN 'SALES'::app_role_new
    ELSE 'SUPPORT'::app_role_new
  END;

-- Step 4: Drop old column and rename
ALTER TABLE profiles DROP COLUMN IF EXISTS rol;
ALTER TABLE profiles RENAME COLUMN rol_new TO rol;

-- Step 5: Set default
ALTER TABLE profiles ALTER COLUMN rol SET DEFAULT 'SALES'::app_role_new;
ALTER TABLE profiles ALTER COLUMN rol SET NOT NULL;

-- Step 6: Drop old enum (if it exists)
DO $$ BEGIN
  DROP TYPE IF EXISTS app_role CASCADE;
EXCEPTION
  WHEN others THEN null;
END $$;

-- Step 7: Rename new enum to standard name
ALTER TYPE app_role_new RENAME TO app_role;

-- Add comment
COMMENT ON COLUMN profiles.rol IS 'CRM Role: ADMIN (full access), SALES (own data), MANAGER (team data), SUPPORT (read-only)';
```

---

### Migration 4: Quotes & Projects (20260103_website_sales_crm.sql)

**BELANGRIJK:** Deze migration is groot (400+ regels).
Open het bestand `supabase/migrations/20260103_website_sales_crm.sql` en kopieer de volledige inhoud.

Dit creëert:
- ✅ projects tabel met pipeline stages
- ✅ quotes tabel met automatische numbering
- ✅ quote_items tabel voor offerte regels
- ✅ project_templates tabel
- ✅ RLS policies voor alle nieuwe tabellen
- ✅ Helper functies voor stats en numbering

---

### Migration 5: Notification System (20260106_notification_system.sql)

**BELANGRIJK:** Deze migration is groot (536 regels).
Open het bestand `supabase/migrations/20260106_notification_system.sql` en kopieer de volledige inhoud.

Dit creëert:
- ✅ notifications tabel
- ✅ Helper functie notify_users()
- ✅ Triggers voor automatische notificaties bij:
  - Lead stage changes
  - Project updates
  - Quote status changes
  - Interaction creations
- ✅ RLS policies voor notifications
- ✅ Cleanup functie voor oude notificaties

---

### Migration 6: Storage Avatars (20260106_storage_avatars.sql)

```sql
-- STORAGE SETUP - Avatar Uploads

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Public bucket so avatars can be displayed
  2097152,  -- 2MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[];

-- RLS POLICIES FOR AVATARS BUCKET

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all avatars (they're profile pictures)
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- HELPER FUNCTION - Get Avatar URL
CREATE OR REPLACE FUNCTION get_avatar_url(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  avatar_path TEXT;
BEGIN
  SELECT avatar_url INTO avatar_path FROM profiles WHERE id = user_id;
  
  IF avatar_path IS NULL OR avatar_path = '' THEN
    RETURN NULL;
  END IF;
  
  IF avatar_path LIKE 'http%' THEN
    RETURN avatar_path;
  END IF;
  
  RETURN current_setting('app.settings.supabase_url', true) || '/storage/v1/object/public/avatars/' || avatar_path;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

### Migration 7: Storage Documents ⭐ NIEUW (20260108_storage_documents.sql)

**BELANGRIJK:** Deze migration is groot (150+ regels).
Open het bestand `supabase/migrations/20260108_storage_documents.sql` en kopieer de volledige inhoud.

Dit creëert:
- ✅ documents bucket (private) met 10MB limit
- ✅ documents tabel voor metadata tracking
- ✅ File type whitelist (PDF, Word, Excel, images)
- ✅ RLS policies voor secure uploads
- ✅ Associations naar companies, contacts, projects, quotes
- ✅ Category support (contract, proposal, invoice, etc.)
- ✅ Delete permissions (ADMIN of uploader)

**Korte versie voor quick setup:**

```sql
-- Create documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket
  10485760,  -- 10MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage bucket
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');

-- Create documents metadata table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  title text,
  description text,
  category text,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT at_least_one_association CHECK (
    company_id IS NOT NULL OR contact_id IS NOT NULL OR 
    project_id IS NOT NULL OR quote_id IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_documents_contact_id ON documents(contact_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_quote_id ON documents(quote_id);

-- RLS for documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents"
ON documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create documents"
ON documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own documents"
ON documents FOR UPDATE TO authenticated USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete documents"
ON documents FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.rol = 'ADMIN')
);
```

---

## ✅ Verificatie Checklist

Na het uitvoeren van alle migrations, verifieer:

### Database Tabellen:
- [ ] `industries` exists met data
- [ ] `companies` exists
- [ ] `contacts` exists
- [ ] `leads` exists
- [ ] `interactions` exists
- [ ] `projects` exists
- [ ] `quotes` exists
- [ ] `quote_items` exists
- [ ] `project_templates` exists
- [ ] `notifications` exists
- [ ] `documents` exists
- [ ] `crm_audit_log` exists

### Storage Buckets:
- [ ] `avatars` bucket exists (public, 2MB limit)
- [ ] `documents` bucket exists (private, 10MB limit)

### Functions:
- [ ] `get_user_role()` exists
- [ ] `is_admin()` exists
- [ ] `notify_users()` exists
- [ ] `get_avatar_url()` exists

### Test Queries:
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check storage buckets
SELECT * FROM storage.buckets;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

🎉 **Klaar!** Je database is volledig opgezet en klaar voor gebruik.

# Supabase Setup Instructies

Dit document beschrijft alle stappen die je in Supabase moet uitvoeren om de volledige functionaliteit van de Verzuimbeheer Applicatie te implementeren.

## 1. Database Schema

### 1.1 Enum Types

Voer deze SQL uit in je Supabase SQL editor:

```sql
-- Rol types
create type public.app_role as enum ('hr', 'manager', 'medewerker');

-- Case status types
create type public.case_status as enum ('actief', 'herstel', 'afgesloten');

-- Task status types
create type public.task_status as enum ('open', 'in_progress', 'completed');

-- Document categorieën
create type public.document_type as enum ('medisch', 'correspondentie', 're-integratie', 'overig');

-- Timeline event types
create type public.event_type as enum ('ziekmelding', 'gesprek', 'herstel', 'afmelding', 'notitie', 'document_upload', 'task_completed', 'status_change');
```

### 1.2 Profiles Table

```sql
-- Gebruikersprofielen (gekoppeld aan auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  voornaam text not null,
  achternaam text not null,
  email text not null unique,
  telefoon text,
  functie text,
  manager_id uuid references public.profiles(id),
  foto_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
```

### 1.3 User Roles Table (BELANGRIJK!)

```sql
-- Gebruikersrollen (aparte tabel voor veiligheid)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;
```

### 1.4 Sick Leave Cases Table

```sql
-- Verzuimzaken
create table public.sick_leave_cases (
  id uuid primary key default gen_random_uuid(),
  medewerker_id uuid references public.profiles(id) on delete cascade not null,
  medewerker_naam text not null,
  start_datum date not null,
  eind_datum date,
  reden text,
  status case_status default 'actief' not null,
  manager_id uuid references public.profiles(id),
  notities text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sick_leave_cases enable row level security;
```

### 1.5 Tasks Table

```sql
-- Taken
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.sick_leave_cases(id) on delete cascade not null,
  titel text not null,
  beschrijving text not null,
  deadline date not null,
  status task_status default 'open' not null,
  toegewezen_aan uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

alter table public.tasks enable row level security;
```

### 1.6 Documents Table

```sql
-- Documenten
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.sick_leave_cases(id) on delete cascade not null,
  naam text not null,
  categorie document_type not null,
  bestand_url text not null,
  bestand_type text not null,
  grootte integer not null,
  uploaded_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.documents enable row level security;
```

### 1.7 Timeline Events Table

```sql
-- Tijdlijn events
create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.sick_leave_cases(id) on delete cascade not null,
  event_type event_type not null,
  beschrijving text not null,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.timeline_events enable row level security;
```

## 2. Security Definer Functions

Deze functions zijn nodig om RLS policies te laten werken zonder recursie:

```sql
-- Check of gebruiker een specifieke rol heeft
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Haal de primaire rol van een gebruiker op
create or replace function public.get_user_role(_user_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = _user_id
  limit 1
$$;

-- Check of gebruiker manager is van een medewerker
create or replace function public.is_manager_of(_manager_id uuid, _employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = _employee_id
      and manager_id = _manager_id
  )
$$;
```

## 3. Row Level Security (RLS) Policies

### 3.1 Profiles Policies

```sql
-- Iedereen kan zijn eigen profiel lezen
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

-- Managers kunnen profielen van hun teamleden zien
create policy "Managers can view team profiles"
on public.profiles for select
using (
  public.has_role(auth.uid(), 'manager')
  and public.is_manager_of(auth.uid(), id)
);

-- HR kan alle profielen zien
create policy "HR can view all profiles"
on public.profiles for select
using (public.has_role(auth.uid(), 'hr'));

-- Users kunnen hun eigen profiel updaten
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id);

-- HR kan alle profielen updaten
create policy "HR can update all profiles"
on public.profiles for update
using (public.has_role(auth.uid(), 'hr'));
```

### 3.2 User Roles Policies

```sql
-- Iedereen kan zijn eigen rol lezen
create policy "Users can view own role"
on public.user_roles for select
using (auth.uid() = user_id);

-- Alleen HR kan rollen aanmaken/wijzigen
create policy "HR can manage roles"
on public.user_roles for all
using (public.has_role(auth.uid(), 'hr'));
```

### 3.3 Sick Leave Cases Policies

```sql
-- Medewerkers kunnen hun eigen cases zien
create policy "Employees can view own cases"
on public.sick_leave_cases for select
using (auth.uid() = medewerker_id);

-- Managers kunnen cases van hun team zien
create policy "Managers can view team cases"
on public.sick_leave_cases for select
using (
  public.has_role(auth.uid(), 'manager')
  and public.is_manager_of(auth.uid(), medewerker_id)
);

-- HR kan alle cases zien
create policy "HR can view all cases"
on public.sick_leave_cases for select
using (public.has_role(auth.uid(), 'hr'));

-- HR kan cases aanmaken
create policy "HR can create cases"
on public.sick_leave_cases for insert
with check (public.has_role(auth.uid(), 'hr'));

-- HR kan cases updaten
create policy "HR can update cases"
on public.sick_leave_cases for update
using (public.has_role(auth.uid(), 'hr'));
```

### 3.4 Tasks Policies

```sql
-- HR kan alle taken zien
create policy "HR can view all tasks"
on public.tasks for select
using (public.has_role(auth.uid(), 'hr'));

-- Managers kunnen taken van hun team zien
create policy "Managers can view team tasks"
on public.tasks for select
using (
  public.has_role(auth.uid(), 'manager')
  and exists (
    select 1 from public.sick_leave_cases c
    where c.id = tasks.case_id
    and public.is_manager_of(auth.uid(), c.medewerker_id)
  )
);

-- Toegewezen personen kunnen hun eigen taken zien
create policy "Users can view assigned tasks"
on public.tasks for select
using (auth.uid() = toegewezen_aan);

-- HR en managers kunnen taken aanmaken
create policy "HR and managers can create tasks"
on public.tasks for insert
with check (
  public.has_role(auth.uid(), 'hr')
  or public.has_role(auth.uid(), 'manager')
);

-- HR en toegewezen personen kunnen taken updaten
create policy "HR and assignees can update tasks"
on public.tasks for update
using (
  public.has_role(auth.uid(), 'hr')
  or auth.uid() = toegewezen_aan
);
```

### 3.5 Documents Policies

```sql
-- HR kan alle documenten zien
create policy "HR can view all documents"
on public.documents for select
using (public.has_role(auth.uid(), 'hr'));

-- Managers kunnen documenten van hun team zien (GEEN medische)
create policy "Managers can view team documents"
on public.documents for select
using (
  public.has_role(auth.uid(), 'manager')
  and categorie != 'medisch'
  and exists (
    select 1 from public.sick_leave_cases c
    where c.id = documents.case_id
    and public.is_manager_of(auth.uid(), c.medewerker_id)
  )
);

-- Medewerkers kunnen hun eigen documenten zien (GEEN medische)
create policy "Employees can view own documents"
on public.documents for select
using (
  categorie != 'medisch'
  and exists (
    select 1 from public.sick_leave_cases c
    where c.id = documents.case_id
    and c.medewerker_id = auth.uid()
  )
);

-- HR kan documenten uploaden
create policy "HR can upload documents"
on public.documents for insert
with check (public.has_role(auth.uid(), 'hr'));

-- Medewerkers kunnen hun eigen documenten uploaden
create policy "Employees can upload own documents"
on public.documents for insert
with check (
  exists (
    select 1 from public.sick_leave_cases c
    where c.id = documents.case_id
    and c.medewerker_id = auth.uid()
  )
);
```

### 3.6 Timeline Events Policies

```sql
-- HR kan alle events zien
create policy "HR can view all events"
on public.timeline_events for select
using (public.has_role(auth.uid(), 'hr'));

-- Managers kunnen events van hun team zien
create policy "Managers can view team events"
on public.timeline_events for select
using (
  public.has_role(auth.uid(), 'manager')
  and exists (
    select 1 from public.sick_leave_cases c
    where c.id = timeline_events.case_id
    and public.is_manager_of(auth.uid(), c.medewerker_id)
  )
);

-- Medewerkers kunnen hun eigen events zien
create policy "Employees can view own events"
on public.timeline_events for select
using (
  exists (
    select 1 from public.sick_leave_cases c
    where c.id = timeline_events.case_id
    and c.medewerker_id = auth.uid()
  )
);

-- HR en managers kunnen events aanmaken
create policy "HR and managers can create events"
on public.timeline_events for insert
with check (
  public.has_role(auth.uid(), 'hr')
  or public.has_role(auth.uid(), 'manager')
);
```

## 4. Triggers voor automatische updates

```sql
-- Functie om updated_at automatisch bij te werken
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Triggers voor updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_sick_leave_cases_updated_at
  before update on public.sick_leave_cases
  for each row execute procedure public.handle_updated_at();

-- Functie om automatisch profiel aan te maken bij registratie
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, voornaam, achternaam, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'voornaam',
    new.raw_user_meta_data ->> 'achternaam',
    new.email
  );
  return new;
end;
$$;

-- Trigger om profiel aan te maken bij nieuwe gebruiker
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 5. Storage Buckets

```sql
-- Documents bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

-- Avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);
```

### Storage Policies

```sql
-- HR kan alle documenten uploaden
create policy "HR can upload documents"
on storage.objects for insert
with check (
  bucket_id = 'documents'
  and public.has_role(auth.uid(), 'hr')
);

-- Medewerkers kunnen documenten uploaden voor hun eigen cases
create policy "Employees can upload own documents"
on storage.objects for insert
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] in (
    select id::text from public.sick_leave_cases
    where medewerker_id = auth.uid()
  )
);

-- Iedereen kan zijn eigen avatar uploaden
create policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- HR kan alle documenten bekijken
create policy "HR can view all documents"
on storage.objects for select
using (
  bucket_id = 'documents'
  and public.has_role(auth.uid(), 'hr')
);

-- Avatars zijn publiek zichtbaar
create policy "Avatars are publicly viewable"
on storage.objects for select
using (bucket_id = 'avatars');
```

## 6. Indexes voor performance

```sql
-- Indexes voor snellere queries
create index idx_profiles_manager_id on public.profiles(manager_id);
create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_sick_leave_cases_medewerker_id on public.sick_leave_cases(medewerker_id);
create index idx_sick_leave_cases_manager_id on public.sick_leave_cases(manager_id);
create index idx_sick_leave_cases_status on public.sick_leave_cases(status);
create index idx_tasks_case_id on public.tasks(case_id);
create index idx_tasks_toegewezen_aan on public.tasks(toegewezen_aan);
create index idx_tasks_deadline on public.tasks(deadline);
create index idx_documents_case_id on public.documents(case_id);
create index idx_timeline_events_case_id on public.timeline_events(case_id);
```

## 7. Test Data (Optioneel)

Voer dit pas uit NADAT je je eerste gebruiker hebt aangemaakt via de applicatie:

```sql
-- Voeg een rol toe aan jezelf (vervang USER_ID met je eigen user ID)
insert into public.user_roles (user_id, role)
values ('YOUR_USER_ID_HERE', 'hr');

-- OF maak jezelf manager:
-- values ('YOUR_USER_ID_HERE', 'manager');

-- OF maak jezelf medewerker:
-- values ('YOUR_USER_ID_HERE', 'medewerker');
```

## 8. Environment Variables

Zorg dat je `.env` bestand deze variabelen bevat:

```
VITE_SUPABASE_URL=je-supabase-project-url
VITE_SUPABASE_ANON_KEY=je-supabase-anon-key
```

## 9. Email Templates (in Supabase Dashboard)

Ga naar Authentication > Email Templates en pas de templates aan voor:
- Confirm signup
- Invite user
- Magic Link
- Reset Password

## 10. URL Configuration

In Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://jouw-lovable-app-url.lovable.app` (of je custom domain)
- **Redirect URLs**: Voeg deze toe:
  - `https://jouw-lovable-app-url.lovable.app/**`
  - `http://localhost:5173/**` (voor local development)

## Checklist

- [ ] Alle enum types aangemaakt
- [ ] Alle tabellen aangemaakt
- [ ] RLS enabled op alle tabellen
- [ ] Security definer functions aangemaakt
- [ ] Alle RLS policies aangemaakt
- [ ] Triggers aangemaakt
- [ ] Storage buckets aangemaakt
- [ ] Storage policies aangemaakt
- [ ] Indexes aangemaakt
- [ ] Environment variables ingesteld
- [ ] URL Configuration ingesteld
- [ ] Eerste gebruiker aangemaakt via app
- [ ] Rol toegewezen aan eerste gebruiker
- [ ] Email templates aangepast (optioneel)

## Troubleshooting

### Ik kan niet inloggen
- Check of de URL Configuration correct is ingesteld
- Check of "Confirm email" is uitgeschakeld (voor sneller testen)

### Ik zie geen data
- Check of je een rol hebt toegewezen aan je gebruiker
- Check de RLS policies met: `SELECT * FROM pg_policies;`

### Queries zijn traag
- Check of alle indexes zijn aangemaakt
- Gebruik `EXPLAIN ANALYZE` om query performance te checken

### RLS recursie errors
- Zorg dat je de security definer functions gebruikt
- Check of de functions correct de search_path instellen

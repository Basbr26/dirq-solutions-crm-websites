-- =====================================================
-- DIRQ POORTWACHTER ASSISTENT - SUPABASE DATABASE SETUP
-- =====================================================
-- Voer dit script uit in je Supabase SQL Editor
-- =====================================================

-- 1. ENUMS
-- =====================================================

-- App rollen
CREATE TYPE public.app_role AS ENUM ('hr', 'manager', 'medewerker');

-- Status van verzuimdossier
CREATE TYPE public.case_status AS ENUM ('actief', 'herstel_gemeld', 'gesloten', 'archief');

-- Taak status
CREATE TYPE public.task_status AS ENUM ('open', 'in_progress', 'afgerond', 'overdue');

-- Document types
CREATE TYPE public.document_type AS ENUM (
  'probleemanalyse', 
  'plan_van_aanpak', 
  'evaluatie_3_maanden',
  'evaluatie_6_maanden',
  'evaluatie_1_jaar',
  'herstelmelding',
  'uwv_melding',
  'overig'
);

-- Event types voor timeline
CREATE TYPE public.event_type AS ENUM (
  'ziekmelding',
  'gesprek',
  'document_toegevoegd',
  'taak_afgerond',
  'herstelmelding',
  'evaluatie',
  'statuswijziging'
);

-- 2. PROFILES TABLE
-- =====================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  voornaam TEXT NOT NULL,
  achternaam TEXT NOT NULL,
  email TEXT NOT NULL,
  telefoon TEXT,
  functie TEXT,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. USER ROLES TABLE (SECURITY CRITICAL)
-- =====================================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. SICK LEAVE CASES (Verzuimdossiers)
-- =====================================================

CREATE TABLE public.sick_leave_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  expected_duration TEXT,
  availability_notes TEXT,
  functional_limitations TEXT,
  can_work_partial BOOLEAN DEFAULT FALSE,
  partial_work_description TEXT,
  case_status case_status DEFAULT 'actief',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sick_leave_cases ENABLE ROW LEVEL SECURITY;

-- 5. TASKS (Taken)
-- =====================================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.sick_leave_cases(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  gespreksonderwerpen TEXT,
  toegestane_vragen TEXT,
  verboden_vragen TEXT,
  juridische_context TEXT,
  deadline DATE NOT NULL,
  task_status task_status DEFAULT 'open',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 6. DOCUMENTS
-- =====================================================

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.sick_leave_cases(id) ON DELETE CASCADE NOT NULL,
  document_type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 7. TIMELINE EVENTS
-- =====================================================

CREATE TABLE public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.sick_leave_cases(id) ON DELETE CASCADE NOT NULL,
  event_type event_type NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- 8. PATTERNS & SIGNALERING
-- =====================================================

CREATE TABLE public.verzuim_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pattern_type TEXT NOT NULL, -- 'kort_verzuim', 'maandag_patroon', 'frequentie'
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  requires_action BOOLEAN DEFAULT FALSE,
  actie_ondernomen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.verzuim_patterns ENABLE ROW LEVEL SECURITY;

-- 9. SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Check if user is manager of employee
CREATE OR REPLACE FUNCTION public.is_manager_of(_manager_id UUID, _employee_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _employee_id
      AND manager_id = _manager_id
  );
$$;

-- 10. RLS POLICIES
-- =====================================================

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Managers can view their team"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'manager') 
    AND manager_id = auth.uid()
  );

CREATE POLICY "HR can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'hr'));

-- USER ROLES POLICIES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "HR can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'hr'));

-- SICK LEAVE CASES POLICIES
CREATE POLICY "Employees can view their own cases"
  ON public.sick_leave_cases FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Managers can view their team's cases"
  ON public.sick_leave_cases FOR SELECT
  USING (
    public.has_role(auth.uid(), 'manager')
    AND public.is_manager_of(auth.uid(), employee_id)
  );

CREATE POLICY "HR can view all cases"
  ON public.sick_leave_cases FOR SELECT
  USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR and Managers can create cases"
  ON public.sick_leave_cases FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'hr') 
    OR (
      public.has_role(auth.uid(), 'manager')
      AND public.is_manager_of(auth.uid(), employee_id)
    )
  );

CREATE POLICY "HR and Managers can update cases"
  ON public.sick_leave_cases FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'hr')
    OR (
      public.has_role(auth.uid(), 'manager')
      AND public.is_manager_of(auth.uid(), employee_id)
    )
  );

-- TASKS POLICIES
CREATE POLICY "Users can view their assigned tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = assigned_to);

CREATE POLICY "HR can view all tasks"
  ON public.tasks FOR SELECT
  USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR can manage all tasks"
  ON public.tasks FOR ALL
  USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Assigned users can update their tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = assigned_to);

-- DOCUMENTS POLICIES
CREATE POLICY "Users can view documents for their cases"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sick_leave_cases
      WHERE id = case_id
      AND (
        employee_id = auth.uid()
        OR public.has_role(auth.uid(), 'hr')
        OR (
          public.has_role(auth.uid(), 'manager')
          AND public.is_manager_of(auth.uid(), employee_id)
        )
      )
    )
  );

CREATE POLICY "HR and Managers can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'hr')
    OR public.has_role(auth.uid(), 'manager')
  );

-- TIMELINE EVENTS POLICIES
CREATE POLICY "Users can view timeline for their cases"
  ON public.timeline_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sick_leave_cases
      WHERE id = case_id
      AND (
        employee_id = auth.uid()
        OR public.has_role(auth.uid(), 'hr')
        OR (
          public.has_role(auth.uid(), 'manager')
          AND public.is_manager_of(auth.uid(), employee_id)
        )
      )
    )
  );

CREATE POLICY "HR and Managers can create timeline events"
  ON public.timeline_events FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'hr')
    OR public.has_role(auth.uid(), 'manager')
  );

-- PATTERNS POLICIES
CREATE POLICY "HR can view all patterns"
  ON public.verzuim_patterns FOR SELECT
  USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Managers can view their team's patterns"
  ON public.verzuim_patterns FOR SELECT
  USING (
    public.has_role(auth.uid(), 'manager')
    AND public.is_manager_of(auth.uid(), employee_id)
  );

CREATE POLICY "HR can manage patterns"
  ON public.verzuim_patterns FOR ALL
  USING (public.has_role(auth.uid(), 'hr'));

-- 11. TRIGGERS
-- =====================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_sick_leave_cases_updated_at
  BEFORE UPDATE ON public.sick_leave_cases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, voornaam, achternaam, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'voornaam', ''),
    COALESCE(NEW.raw_user_meta_data->>'achternaam', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('documents', 'documents', false),
  ('avatars', 'avatars', true);

-- Storage policies for documents
CREATE POLICY "HR and Managers can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      public.has_role(auth.uid(), 'hr')
      OR public.has_role(auth.uid(), 'manager')
    )
  );

CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 13. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_profiles_manager_id ON public.profiles(manager_id);
CREATE INDEX idx_sick_leave_cases_employee_id ON public.sick_leave_cases(employee_id);
CREATE INDEX idx_sick_leave_cases_status ON public.sick_leave_cases(case_status);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_case_id ON public.tasks(case_id);
CREATE INDEX idx_tasks_deadline ON public.tasks(deadline);
CREATE INDEX idx_tasks_status ON public.tasks(task_status);
CREATE INDEX idx_documents_case_id ON public.documents(case_id);
CREATE INDEX idx_timeline_events_case_id ON public.timeline_events(case_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- =====================================================
-- SETUP COMPLEET
-- =====================================================

-- VOLGENDE STAPPEN:
-- 1. Maak je eerste HR gebruiker aan via Supabase Auth
-- 2. Voer deze query uit om HR rol toe te kennen:
--    INSERT INTO public.user_roles (user_id, role) 
--    VALUES ('[jouw-user-id]', 'hr');
-- 3. Je bent klaar om te starten!

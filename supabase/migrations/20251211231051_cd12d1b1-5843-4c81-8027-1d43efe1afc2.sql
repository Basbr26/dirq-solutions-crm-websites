-- Voeg extra werknemersgegevens toe aan profiles tabel
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS employee_number TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'fulltime' CHECK (contract_type IN ('fulltime', 'parttime', 'tijdelijk', 'oproep', 'stage')),
ADD COLUMN IF NOT EXISTS hours_per_week NUMERIC(4,1) DEFAULT 40,
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'actief' CHECK (employment_status IN ('actief', 'inactief', 'met_verlof', 'uit_dienst')),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS bsn_encrypted TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Creëer verlofsoorten enum
DO $$ BEGIN
  CREATE TYPE public.leave_type AS ENUM ('vakantie', 'adv', 'bijzonder', 'onbetaald', 'ouderschaps', 'zwangerschaps');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Creëer verlofstatus enum
DO $$ BEGIN
  CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Creëer verlofaanvragen tabel
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC(4,1) NOT NULL,
  hours NUMERIC(5,1),
  reason TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Creëer verlofsaldo tabel
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  leave_type leave_type NOT NULL,
  total_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  used_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  pending_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, year, leave_type)
);

-- Creëer employee_notes tabel voor notities bij werknemers
CREATE TABLE IF NOT EXISTS public.employee_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor leave_requests
CREATE POLICY "Employees can view their own leave requests"
ON public.leave_requests FOR SELECT
USING (auth.uid() = employee_id);

CREATE POLICY "Employees can create their own leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "HR can manage all leave requests"
ON public.leave_requests FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Managers can view their team's leave requests"
ON public.leave_requests FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) AND is_manager_of(auth.uid(), employee_id));

CREATE POLICY "Managers can update their team's leave requests"
ON public.leave_requests FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) AND is_manager_of(auth.uid(), employee_id));

CREATE POLICY "Super admin can manage all leave requests"
ON public.leave_requests FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies voor leave_balances
CREATE POLICY "Employees can view their own leave balances"
ON public.leave_balances FOR SELECT
USING (auth.uid() = employee_id);

CREATE POLICY "HR can manage all leave balances"
ON public.leave_balances FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Managers can view their team's leave balances"
ON public.leave_balances FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) AND is_manager_of(auth.uid(), employee_id));

CREATE POLICY "Super admin can manage all leave balances"
ON public.leave_balances FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies voor employee_notes
CREATE POLICY "HR can manage all employee notes"
ON public.employee_notes FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Managers can manage notes for their team"
ON public.employee_notes FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) AND is_manager_of(auth.uid(), employee_id));

CREATE POLICY "Super admin can manage all employee notes"
ON public.employee_notes FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Triggers voor updated_at
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_employee_notes_updated_at
  BEFORE UPDATE ON public.employee_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
-- Create onboarding templates table (reusable checklists)
CREATE TABLE public.onboarding_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create onboarding template items (tasks within a template)
CREATE TABLE public.onboarding_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'algemeen',
  due_days INTEGER DEFAULT 7, -- Days after start to complete
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  assigned_to_role TEXT DEFAULT 'hr', -- hr, manager, employee
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee onboarding sessions
CREATE TABLE public.onboarding_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.onboarding_templates(id),
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed, cancelled
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_completion_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create onboarding tasks (actual tasks for an employee)
CREATE TABLE public.onboarding_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES public.onboarding_template_items(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'algemeen',
  due_date DATE,
  is_required BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_templates
CREATE POLICY "HR can manage onboarding templates" ON public.onboarding_templates
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Super admin can manage onboarding templates" ON public.onboarding_templates
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Managers can view onboarding templates" ON public.onboarding_templates
  FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for onboarding_template_items
CREATE POLICY "HR can manage template items" ON public.onboarding_template_items
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Super admin can manage template items" ON public.onboarding_template_items
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Managers can view template items" ON public.onboarding_template_items
  FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for onboarding_sessions
CREATE POLICY "HR can manage all onboarding sessions" ON public.onboarding_sessions
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Super admin can manage all onboarding sessions" ON public.onboarding_sessions
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Managers can manage their team's onboarding" ON public.onboarding_sessions
  FOR ALL USING (has_role(auth.uid(), 'manager'::app_role) AND is_manager_of(auth.uid(), employee_id));
CREATE POLICY "Employees can view their own onboarding" ON public.onboarding_sessions
  FOR SELECT USING (auth.uid() = employee_id);

-- RLS Policies for onboarding_tasks
CREATE POLICY "HR can manage all onboarding tasks" ON public.onboarding_tasks
  FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Super admin can manage all onboarding tasks" ON public.onboarding_tasks
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Managers can manage their team's tasks" ON public.onboarding_tasks
  FOR ALL USING (
    has_role(auth.uid(), 'manager'::app_role) AND 
    EXISTS (
      SELECT 1 FROM public.onboarding_sessions os 
      WHERE os.id = onboarding_tasks.session_id 
      AND is_manager_of(auth.uid(), os.employee_id)
    )
  );
CREATE POLICY "Employees can view and update their own tasks" ON public.onboarding_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_sessions os 
      WHERE os.id = onboarding_tasks.session_id 
      AND os.employee_id = auth.uid()
    )
  );
CREATE POLICY "Assigned users can update their tasks" ON public.onboarding_tasks
  FOR UPDATE USING (auth.uid() = assigned_to);

-- Triggers for updated_at
CREATE TRIGGER update_onboarding_templates_updated_at
  BEFORE UPDATE ON public.onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_onboarding_sessions_updated_at
  BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_onboarding_tasks_updated_at
  BEFORE UPDATE ON public.onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default onboarding template
INSERT INTO public.onboarding_templates (name, description) VALUES 
('Standaard Onboarding', 'Standaard onboarding checklist voor nieuwe medewerkers');

-- Get the template ID and insert items
INSERT INTO public.onboarding_template_items (template_id, title, description, category, due_days, assigned_to_role, sort_order) 
SELECT 
  id,
  item.title,
  item.description,
  item.category,
  item.due_days,
  item.assigned_to_role,
  item.sort_order
FROM public.onboarding_templates, 
(VALUES 
  ('Arbeidsovereenkomst ondertekenen', 'Onderteken de arbeidsovereenkomst digitaal', 'administratie', 1, 'employee', 1),
  ('Kopie ID-bewijs aanleveren', 'Upload een kopie van je identiteitsbewijs', 'administratie', 3, 'employee', 2),
  ('Bankgegevens doorgeven', 'Vul je bankgegevens in voor salarisuitbetaling', 'administratie', 3, 'employee', 3),
  ('Noodcontact opgeven', 'Geef een noodcontactpersoon op', 'administratie', 5, 'employee', 4),
  ('Laptop/werkplek klaarmaken', 'IT bereidt laptop en werkplek voor', 'it', 0, 'hr', 5),
  ('E-mail account aanmaken', 'Maak een bedrijfs e-mailadres aan', 'it', 0, 'hr', 6),
  ('Toegangspas aanvragen', 'Vraag een toegangspas aan voor het gebouw', 'it', 1, 'hr', 7),
  ('Welkomstgesprek plannen', 'Plan een kennismakingsgesprek met het team', 'sociaal', 1, 'manager', 8),
  ('Rondleiding kantoor', 'Geef een rondleiding door het kantoor', 'sociaal', 1, 'manager', 9),
  ('Introductie team', 'Stel de nieuwe medewerker voor aan het team', 'sociaal', 1, 'manager', 10),
  ('Bedrijfsreglement doorlezen', 'Lees het bedrijfsreglement door', 'compliance', 5, 'employee', 11),
  ('Veiligheidsvoorschriften doorlezen', 'Neem de veiligheidsvoorschriften door', 'compliance', 5, 'employee', 12),
  ('Privacy policy accepteren', 'Accepteer de privacy policy', 'compliance', 5, 'employee', 13),
  ('Eerste werkdoelen bespreken', 'Bespreek de doelen voor de eerste periode', 'werk', 7, 'manager', 14),
  ('Inwerken op systemen', 'Training op de belangrijkste systemen', 'werk', 14, 'manager', 15)
) AS item(title, description, category, due_days, assigned_to_role, sort_order)
WHERE onboarding_templates.name = 'Standaard Onboarding';
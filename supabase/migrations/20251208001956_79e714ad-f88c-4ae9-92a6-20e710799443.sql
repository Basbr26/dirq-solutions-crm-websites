-- 1. Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 2. Add department_id to profiles
ALTER TABLE public.profiles ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 3. Create RLS policies for departments

-- Super admin can manage all departments
CREATE POLICY "Super admin can manage departments" 
ON public.departments 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- HR can view all departments
CREATE POLICY "HR can view departments" 
ON public.departments 
FOR SELECT 
USING (has_role(auth.uid(), 'hr'::app_role));

-- Managers can view departments
CREATE POLICY "Managers can view departments" 
ON public.departments 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role));

-- Employees can view their own department
CREATE POLICY "Employees can view their department" 
ON public.departments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.department_id = departments.id
));

-- 4. Add super_admin policies to existing tables

-- Super admin can manage all profiles
CREATE POLICY "Super admin can manage profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage all user_roles
CREATE POLICY "Super admin can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage all sick_leave_cases
CREATE POLICY "Super admin can manage all cases" 
ON public.sick_leave_cases 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage all tasks
CREATE POLICY "Super admin can manage all tasks" 
ON public.tasks 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage all documents
CREATE POLICY "Super admin can manage all documents" 
ON public.documents 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage all timeline_events
CREATE POLICY "Super admin can manage timeline events" 
ON public.timeline_events 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage all notifications
CREATE POLICY "Super admin can manage all notifications" 
ON public.notifications 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage all conversation_notes
CREATE POLICY "Super admin can manage conversation notes" 
ON public.conversation_notes 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage all verzuim_patterns
CREATE POLICY "Super admin can manage verzuim patterns" 
ON public.verzuim_patterns 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage document_invitations
CREATE POLICY "Super admin can manage document invitations" 
ON public.document_invitations 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 5. Create updated_at trigger for departments
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. Create indexes for performance
CREATE INDEX idx_profiles_department_id ON public.profiles(department_id);
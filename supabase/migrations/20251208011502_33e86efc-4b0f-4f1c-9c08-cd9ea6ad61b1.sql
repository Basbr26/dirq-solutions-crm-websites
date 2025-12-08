-- Create activity log table for audit trail
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  case_id UUID REFERENCES public.sick_leave_cases(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_case_id ON public.activity_logs(case_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- HR can view all activity logs
CREATE POLICY "HR can view all activity logs"
ON public.activity_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'hr') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Managers can view activity logs for cases of their employees
CREATE POLICY "Managers can view activity logs for their employees"
ON public.activity_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'manager') AND
  EXISTS (
    SELECT 1 FROM public.sick_leave_cases slc
    JOIN public.profiles p ON p.id = slc.employee_id
    WHERE slc.id = activity_logs.case_id
    AND p.manager_id = auth.uid()
  )
);

-- Employees can view their own case activity logs
CREATE POLICY "Employees can view their own case activity logs"
ON public.activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sick_leave_cases slc
    WHERE slc.id = activity_logs.case_id
    AND slc.employee_id = auth.uid()
  )
);

-- Anyone authenticated can insert activity logs
CREATE POLICY "Authenticated users can create activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add calendar_reminder_sent column to tasks for tracking
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS calendar_reminder_sent BOOLEAN DEFAULT false;

-- Add last_reminder_at to tasks to prevent duplicate reminders
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMP WITH TIME ZONE;
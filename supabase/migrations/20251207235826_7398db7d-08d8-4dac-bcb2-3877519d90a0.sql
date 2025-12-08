-- Create conversation_notes table for managers to log conversations with employees
CREATE TABLE public.conversation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.sick_leave_cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  conversation_type TEXT NOT NULL DEFAULT 'telefonisch',
  summary TEXT NOT NULL,
  discussed_topics TEXT,
  agreements TEXT,
  follow_up_actions TEXT,
  employee_mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;

-- HR can manage all conversation notes
CREATE POLICY "HR can manage all conversation notes"
  ON public.conversation_notes
  FOR ALL
  USING (has_role(auth.uid(), 'hr'::app_role));

-- Managers can manage notes for their team's cases
CREATE POLICY "Managers can manage their team's conversation notes"
  ON public.conversation_notes
  FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role) AND 
    EXISTS (
      SELECT 1 FROM public.sick_leave_cases slc
      WHERE slc.id = conversation_notes.case_id
      AND is_manager_of(auth.uid(), slc.employee_id)
    )
  );

-- Employees can view notes about their own cases
CREATE POLICY "Employees can view notes for their cases"
  ON public.conversation_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sick_leave_cases slc
      WHERE slc.id = conversation_notes.case_id
      AND slc.employee_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_conversation_notes_updated_at
  BEFORE UPDATE ON public.conversation_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
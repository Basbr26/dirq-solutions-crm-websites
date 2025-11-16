-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "HR and Managers can delete documents" ON public.documents;
DROP POLICY IF EXISTS "HR and Managers can delete timeline events" ON public.timeline_events;
DROP POLICY IF EXISTS "HR and Managers can delete cases" ON public.sick_leave_cases;
DROP POLICY IF EXISTS "HR can delete tasks" ON public.tasks;

-- Documents: allow delete when user is HR or a manager of the employee linked to the case
CREATE POLICY "HR and Managers can delete documents"
ON public.documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.sick_leave_cases
    WHERE sick_leave_cases.id = documents.case_id
      AND (
        has_role(auth.uid(), 'hr'::app_role)
        OR (
          has_role(auth.uid(), 'manager'::app_role)
          AND is_manager_of(auth.uid(), sick_leave_cases.employee_id)
        )
      )
  )
);

-- Timeline events: allow delete with same condition
CREATE POLICY "HR and Managers can delete timeline events"
ON public.timeline_events
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.sick_leave_cases
    WHERE sick_leave_cases.id = timeline_events.case_id
      AND (
        has_role(auth.uid(), 'hr'::app_role)
        OR (
          has_role(auth.uid(), 'manager'::app_role)
          AND is_manager_of(auth.uid(), sick_leave_cases.employee_id)
        )
      )
  )
);

-- Cases: allow delete for HR or managers of the employee
CREATE POLICY "HR and Managers can delete cases"
ON public.sick_leave_cases
FOR DELETE
USING (
  has_role(auth.uid(), 'hr'::app_role)
  OR (
    has_role(auth.uid(), 'manager'::app_role)
    AND is_manager_of(auth.uid(), employee_id)
  )
);

-- Tasks: allow delete for HR
CREATE POLICY "HR can delete tasks"
ON public.tasks
FOR DELETE
USING (
  has_role(auth.uid(), 'hr'::app_role)
);
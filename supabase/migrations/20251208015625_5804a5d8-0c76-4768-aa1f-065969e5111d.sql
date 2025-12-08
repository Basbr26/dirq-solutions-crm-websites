-- Function to notify user when a task is assigned to them
CREATE OR REPLACE FUNCTION public.notify_on_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_name TEXT;
  case_employee_name TEXT;
BEGIN
  -- For UPDATE, only trigger if assigned_to actually changed
  IF TG_OP = 'UPDATE' AND OLD.assigned_to = NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  -- Get the name of the employee the case belongs to
  SELECT CONCAT(p.voornaam, ' ', p.achternaam) INTO case_employee_name
  FROM public.sick_leave_cases slc
  JOIN public.profiles p ON p.id = slc.employee_id
  WHERE slc.id = NEW.case_id;

  -- Create notification for the assigned user
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    notification_type,
    case_id,
    task_id
  ) VALUES (
    NEW.assigned_to,
    'Nieuwe taak toegewezen',
    CONCAT('U heeft een nieuwe taak: "', NEW.title, '" voor de verzuimcase van ', case_employee_name, '. Deadline: ', TO_CHAR(NEW.deadline, 'DD-MM-YYYY')),
    'task_reminder',
    NEW.case_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;

-- Create trigger for task assignment (both insert and update)
DROP TRIGGER IF EXISTS trigger_notify_on_task_assigned ON public.tasks;
CREATE TRIGGER trigger_notify_on_task_assigned
  AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_assigned();
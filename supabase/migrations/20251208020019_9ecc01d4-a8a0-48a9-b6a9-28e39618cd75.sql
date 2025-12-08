-- Function to notify when a task is completed
CREATE OR REPLACE FUNCTION public.notify_on_task_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hr_user RECORD;
  case_employee_id UUID;
  case_employee_name TEXT;
  completer_name TEXT;
  manager_id UUID;
BEGIN
  -- Only trigger if status changed to 'afgerond'
  IF NOT (OLD.task_status IS DISTINCT FROM NEW.task_status AND NEW.task_status = 'afgerond') THEN
    RETURN NEW;
  END IF;

  -- Get case employee info and manager
  SELECT slc.employee_id, CONCAT(p.voornaam, ' ', p.achternaam), p.manager_id
  INTO case_employee_id, case_employee_name, manager_id
  FROM public.sick_leave_cases slc
  JOIN public.profiles p ON p.id = slc.employee_id
  WHERE slc.id = NEW.case_id;

  -- Get completer name
  SELECT CONCAT(voornaam, ' ', achternaam) INTO completer_name
  FROM public.profiles
  WHERE id = NEW.assigned_to;

  -- Notify HR users (exclude the person who completed it)
  FOR hr_user IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role IN ('hr', 'super_admin')
    AND ur.user_id != NEW.assigned_to
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      case_id,
      task_id
    ) VALUES (
      hr_user.user_id,
      'Taak afgerond',
      CONCAT(completer_name, ' heeft de taak "', NEW.title, '" afgerond voor de verzuimcase van ', case_employee_name, '.'),
      'task_reminder',
      NEW.case_id,
      NEW.id
    );
  END LOOP;

  -- Notify manager if exists, not the completer, and not already HR
  IF manager_id IS NOT NULL 
     AND manager_id != NEW.assigned_to
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles 
       WHERE user_id = manager_id AND role IN ('hr', 'super_admin')
     ) 
  THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      case_id,
      task_id
    ) VALUES (
      manager_id,
      'Taak afgerond',
      CONCAT(completer_name, ' heeft de taak "', NEW.title, '" afgerond voor de verzuimcase van ', case_employee_name, '.'),
      'task_reminder',
      NEW.case_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for task completion
DROP TRIGGER IF EXISTS trigger_notify_on_task_completed ON public.tasks;
CREATE TRIGGER trigger_notify_on_task_completed
  AFTER UPDATE OF task_status ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_completed();
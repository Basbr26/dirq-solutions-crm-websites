-- Function to notify HR users when a sick leave case is created
CREATE OR REPLACE FUNCTION public.notify_hr_on_case_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hr_user RECORD;
  employee_name TEXT;
  creator_name TEXT;
BEGIN
  -- Get employee name
  SELECT CONCAT(voornaam, ' ', achternaam) INTO employee_name
  FROM public.profiles
  WHERE id = NEW.employee_id;

  -- Get creator name
  SELECT CONCAT(voornaam, ' ', achternaam) INTO creator_name
  FROM public.profiles
  WHERE id = NEW.created_by;

  -- Notify all HR users (exclude the creator to avoid self-notification)
  FOR hr_user IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role IN ('hr', 'super_admin')
    AND ur.user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      case_id
    ) VALUES (
      hr_user.user_id,
      'Nieuwe ziekmelding',
      CONCAT('Manager ', creator_name, ' heeft een ziekmelding aangemaakt voor ', employee_name),
      'case_update',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function to notify relevant users when case status changes
CREATE OR REPLACE FUNCTION public.notify_on_case_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hr_user RECORD;
  employee_name TEXT;
  manager_id UUID;
  status_label TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.case_status = NEW.case_status THEN
    RETURN NEW;
  END IF;

  -- Get employee name and manager
  SELECT p.voornaam || ' ' || p.achternaam, p.manager_id 
  INTO employee_name, manager_id
  FROM public.profiles p
  WHERE p.id = NEW.employee_id;

  -- Get readable status label
  status_label := CASE NEW.case_status
    WHEN 'actief' THEN 'Actief'
    WHEN 'herstel_gemeld' THEN 'Herstel gemeld'
    WHEN 'gesloten' THEN 'Gesloten'
    WHEN 'archief' THEN 'Gearchiveerd'
    ELSE NEW.case_status::text
  END;

  -- Notify all HR users
  FOR hr_user IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role IN ('hr', 'super_admin')
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      case_id
    ) VALUES (
      hr_user.user_id,
      'Case status gewijzigd',
      CONCAT('De status van de verzuimcase voor ', employee_name, ' is gewijzigd naar: ', status_label),
      'case_update',
      NEW.id
    );
  END LOOP;

  -- Notify the manager if exists and not already notified as HR
  IF manager_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = manager_id AND role IN ('hr', 'super_admin')
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      case_id
    ) VALUES (
      manager_id,
      'Case status gewijzigd',
      CONCAT('De status van de verzuimcase voor ', employee_name, ' is gewijzigd naar: ', status_label),
      'case_update',
      NEW.id
    );
  END IF;

  -- Notify the employee
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    notification_type,
    case_id
  ) VALUES (
    NEW.employee_id,
    'Status van uw verzuimcase gewijzigd',
    CONCAT('De status van uw verzuimcase is gewijzigd naar: ', status_label),
    'case_update',
    NEW.id
  );

  RETURN NEW;
END;
$$;

-- Create trigger for new case creation
DROP TRIGGER IF EXISTS trigger_notify_hr_on_case_created ON public.sick_leave_cases;
CREATE TRIGGER trigger_notify_hr_on_case_created
  AFTER INSERT ON public.sick_leave_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_hr_on_case_created();

-- Create trigger for case status changes
DROP TRIGGER IF EXISTS trigger_notify_on_case_status_change ON public.sick_leave_cases;
CREATE TRIGGER trigger_notify_on_case_status_change
  AFTER UPDATE ON public.sick_leave_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_case_status_change();
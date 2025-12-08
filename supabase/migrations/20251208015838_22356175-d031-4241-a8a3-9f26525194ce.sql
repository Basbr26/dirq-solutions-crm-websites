-- Function to notify when a document requires signature
CREATE OR REPLACE FUNCTION public.notify_on_document_signature_required()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  case_employee_id UUID;
  case_employee_name TEXT;
  uploader_name TEXT;
BEGIN
  -- Only notify if document requires signatures
  IF NEW.requires_signatures IS NULL OR array_length(NEW.requires_signatures, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get case employee info
  SELECT slc.employee_id, CONCAT(p.voornaam, ' ', p.achternaam)
  INTO case_employee_id, case_employee_name
  FROM public.sick_leave_cases slc
  JOIN public.profiles p ON p.id = slc.employee_id
  WHERE slc.id = NEW.case_id;

  -- Get uploader name
  SELECT CONCAT(voornaam, ' ', achternaam) INTO uploader_name
  FROM public.profiles
  WHERE id = NEW.uploaded_by;

  -- If 'employee' is in requires_signatures, notify the employee
  IF 'employee' = ANY(NEW.requires_signatures) THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      case_id
    ) VALUES (
      case_employee_id,
      'Document vereist uw handtekening',
      CONCAT('Het document "', NEW.file_name, '" is geüpload door ', uploader_name, ' en vereist uw handtekening.'),
      'case_update',
      NEW.case_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function to notify when a document is signed
CREATE OR REPLACE FUNCTION public.notify_on_document_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hr_user RECORD;
  case_employee_name TEXT;
  manager_id UUID;
BEGIN
  -- Only trigger if status changed to 'signed' or owner_signed changed to true
  IF NOT (
    (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'signed') OR
    (OLD.owner_signed IS DISTINCT FROM NEW.owner_signed AND NEW.owner_signed = true)
  ) THEN
    RETURN NEW;
  END IF;

  -- Get case employee info and manager
  SELECT CONCAT(p.voornaam, ' ', p.achternaam), p.manager_id
  INTO case_employee_name, manager_id
  FROM public.sick_leave_cases slc
  JOIN public.profiles p ON p.id = slc.employee_id
  WHERE slc.id = NEW.case_id;

  -- Notify HR users
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
      'Document ondertekend',
      CONCAT('Het document "', NEW.file_name, '" voor ', case_employee_name, ' is ondertekend.'),
      'case_update',
      NEW.case_id
    );
  END LOOP;

  -- Notify manager if exists and not already HR
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
      'Document ondertekend',
      CONCAT('Het document "', NEW.file_name, '" voor ', case_employee_name, ' is ondertekend.'),
      'case_update',
      NEW.case_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for document signature required
DROP TRIGGER IF EXISTS trigger_notify_on_document_signature_required ON public.documents;
CREATE TRIGGER trigger_notify_on_document_signature_required
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_document_signature_required();

-- Create trigger for document signed
DROP TRIGGER IF EXISTS trigger_notify_on_document_signed ON public.documents;
CREATE TRIGGER trigger_notify_on_document_signed
  AFTER UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_document_signed();
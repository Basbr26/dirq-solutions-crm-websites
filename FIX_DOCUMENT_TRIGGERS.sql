-- Fix document notification triggers to handle HR documents (without case_id)
-- These triggers should only fire for verzuim documents that have a case_id

-- Drop existing triggers first (all possible name variations)
DROP TRIGGER IF EXISTS on_document_signature_request ON public.documents;
DROP TRIGGER IF EXISTS trigger_notify_on_document_signature_request ON public.documents;
DROP TRIGGER IF EXISTS trigger_notify_on_document_signature_required ON public.documents;
DROP TRIGGER IF EXISTS on_document_signed ON public.documents;
DROP TRIGGER IF EXISTS trigger_notify_on_document_signed ON public.documents;

-- Now drop functions (all possible name variations)
DROP FUNCTION IF EXISTS public.notify_on_document_signature_request() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_document_signature_required() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_document_signed() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_on_document_signature_request()
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
  -- Only process if this is a verzuim document (has case_id)
  IF NEW.case_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only trigger if requires_signatures is set and not empty
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

-- Recreate trigger
CREATE TRIGGER on_document_signature_request
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_document_signature_request();

-- Create the document signed notification function
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
  -- Only process if this is a verzuim document (has case_id)
  IF NEW.case_id IS NULL THEN
    RETURN NEW;
  END IF;

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
    WHERE ur.role IN ('hr_medewerker', 'super_admin')
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
      CONCAT(case_employee_name, ' heeft het document "', NEW.file_name, '" ondertekend.'),
      'case_update',
      NEW.case_id
    );
  END LOOP;

  -- Notify manager if exists
  IF manager_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      case_id
    ) VALUES (
      manager_id,
      'Document ondertekend',
      CONCAT(case_employee_name, ' heeft het document "', NEW.file_name, '" ondertekend.'),
      'case_update',
      NEW.case_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_document_signed
  AFTER UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_document_signed();

COMMENT ON FUNCTION public.notify_on_document_signature_request() IS 'Notify employee when a verzuim document requires their signature. Skips HR documents without case_id.';
COMMENT ON FUNCTION public.notify_on_document_signed() IS 'Notify HR and manager when a verzuim document is signed. Skips HR documents without case_id.';

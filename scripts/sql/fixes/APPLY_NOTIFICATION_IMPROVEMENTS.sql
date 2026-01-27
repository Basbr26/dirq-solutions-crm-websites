    -- ============================================================
    -- RUN THIS IN SUPABASE SQL EDITOR
    -- ============================================================
    -- Improves notification messages with project/quote titles and company names
    -- ============================================================

    -- Improved notify_project_stage_change with project title and company name
    CREATE OR REPLACE FUNCTION notify_project_stage_change()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_catalog
    AS $$
    DECLARE
    v_company_name TEXT;
    v_stage_label TEXT;
    BEGIN
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
        -- Get company name
        SELECT c.name INTO v_company_name
        FROM companies c
        WHERE c.id = NEW.company_id;
        
        -- Format stage label (make it readable)
        v_stage_label := CASE NEW.stage
        WHEN 'lead' THEN 'Lead'
        WHEN 'quote_requested' THEN 'Offerte Aangevraagd'
        WHEN 'quote_sent' THEN 'Offerte Verstuurd'
        WHEN 'negotiation' THEN 'Onderhandeling'
        WHEN 'quote_signed' THEN 'Offerte Getekend'
        WHEN 'in_development' THEN 'In Ontwikkeling'
        WHEN 'review' THEN 'Review'
        WHEN 'live' THEN 'Live'
        WHEN 'maintenance' THEN 'Onderhoud'
        WHEN 'lost' THEN 'Verloren'
        ELSE NEW.stage
        END;
        
        INSERT INTO public.notifications (
        user_id, 
        type, 
        title, 
        message, 
        related_entity_type, 
        related_entity_id,
        deep_link
        ) VALUES (
        NEW.owner_id,
        'update',
        'Project Stage Updated',
        'Project "' || NEW.title || '" (' || COALESCE(v_company_name, 'Geen bedrijf') || ') changed to ' || v_stage_label,
        'project',
        NEW.id,
        '/projects/' || NEW.id
        );
    END IF;
    RETURN NEW;
    END;
    $$;

    -- Improved notify_quote_status_change with quote title and company name
    CREATE OR REPLACE FUNCTION notify_quote_status_change()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_catalog
    AS $$
    DECLARE
    v_company_name TEXT;
    v_quote_title TEXT;
    v_status_label TEXT;
    BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Get company name and quote title
        SELECT 
        c.name,
        q.title
        INTO v_company_name, v_quote_title
        FROM quotes q
        LEFT JOIN companies c ON c.id = q.company_id
        WHERE q.id = NEW.id;
        
        -- Format status label
        v_status_label := CASE NEW.status
        WHEN 'draft' THEN 'Concept'
        WHEN 'sent' THEN 'Verzonden'
        WHEN 'viewed' THEN 'Bekeken'
        WHEN 'accepted' THEN 'Geaccepteerd'
        WHEN 'rejected' THEN 'Afgewezen'
        WHEN 'expired' THEN 'Verlopen'
        WHEN 'signed' THEN 'Getekend'
        ELSE NEW.status
        END;
        
        INSERT INTO public.notifications (
        user_id, 
        type, 
        title, 
        message, 
        related_entity_type, 
        related_entity_id,
        deep_link
        ) VALUES (
        NEW.owner_id,
        'update',
        'Quote Status Updated',
        'Quote "' || COALESCE(v_quote_title, NEW.quote_number) || '" (' || COALESCE(v_company_name, 'Geen bedrijf') || ') changed to ' || v_status_label,
        'quote',
        NEW.id,
        '/quotes/' || NEW.id
        );
    END IF;
    RETURN NEW;
    END;
    $$;

    -- Improved notify_lead_stage_change with lead name/company
    CREATE OR REPLACE FUNCTION notify_lead_stage_change()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_catalog
    AS $$
    DECLARE
    v_stage_label TEXT;
    BEGIN
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
        -- Format stage label
        v_stage_label := CASE NEW.stage
        WHEN 'new' THEN 'Nieuw'
        WHEN 'contacted' THEN 'Gecontacteerd'
        WHEN 'qualified' THEN 'Gekwalificeerd'
        WHEN 'proposal' THEN 'Voorstel'
        WHEN 'won' THEN 'Gewonnen'
        WHEN 'lost' THEN 'Verloren'
        ELSE NEW.stage
        END;
        
        INSERT INTO public.notifications (
        user_id, 
        type, 
        title, 
        message, 
        related_entity_type, 
        related_entity_id,
        deep_link
        ) VALUES (
        NEW.assigned_to,
        'update',
        'Lead Status Updated',
        'Lead "' || COALESCE(NEW.company_name, 'Unnamed') || '" changed to ' || v_stage_label,
        'lead',
        NEW.id,
        '/leads/' || NEW.id
        );
    END IF;
    RETURN NEW;
    END;
    $$;

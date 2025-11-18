-- Integratie van document signing met verzuim app
-- Voeg case_id toe aan documents table om documenten te koppelen aan verzuimcases

-- Voeg case_id kolom toe aan documents table (if not exists check)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'documents' AND column_name = 'case_id') THEN
    ALTER TABLE public.documents
    ADD COLUMN case_id UUID REFERENCES public.sick_leave_cases(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Voeg document_type kolom toe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'documents' AND column_name = 'document_type') THEN
    ALTER TABLE public.documents
    ADD COLUMN document_type TEXT;
  END IF;
END $$;

-- Voeg requires_signatures kolom toe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'documents' AND column_name = 'requires_signatures') THEN
    ALTER TABLE public.documents
    ADD COLUMN requires_signatures TEXT[] DEFAULT ARRAY['employee'::TEXT];
  END IF;
END $$;

-- Voeg status kolom toe voor document status tracking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'documents' AND column_name = 'status') THEN
    ALTER TABLE public.documents
    ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Voeg owner signature velden toe (voor werkgever/HR)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'documents' AND column_name = 'owner_signed') THEN
    ALTER TABLE public.documents
    ADD COLUMN owner_signed BOOLEAN DEFAULT FALSE,
    ADD COLUMN owner_signature_data TEXT,
    ADD COLUMN owner_signed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Voeg signed_file_path toe voor getekende versie
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'documents' AND column_name = 'signed_file_path') THEN
    ALTER TABLE public.documents
    ADD COLUMN signed_file_path TEXT;
  END IF;
END $$;

-- Index voor betere performance
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- Document Invitations Table (voor externe handtekeningen)
CREATE TABLE IF NOT EXISTS public.document_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  signed BOOLEAN DEFAULT FALSE,
  signature_data TEXT,
  signed_document_path TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS idx_document_invitations_document_id ON public.document_invitations(document_id);
CREATE INDEX IF NOT EXISTS idx_document_invitations_email ON public.document_invitations(email);
CREATE INDEX IF NOT EXISTS idx_document_invitations_code ON public.document_invitations(verification_code);

-- Enable RLS
ALTER TABLE public.document_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor document_invitations
CREATE POLICY "Users can view invitations sent to their email"
ON public.document_invitations FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('hr', 'manager')
  )
);

CREATE POLICY "HR and managers can create invitations"
ON public.document_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('hr', 'manager')
  )
);

CREATE POLICY "Invited users can update their own invitations"
ON public.document_invitations FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('hr', 'manager')
  )
);

-- Update bestaande documents RLS policies voor case_id
DROP POLICY IF EXISTS "HR and managers can view case documents" ON public.documents;
CREATE POLICY "HR and managers can view case documents"
ON public.documents FOR SELECT
USING (
  -- Document owner
  auth.uid() = uploaded_by
  -- Of HR/Manager
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('hr', 'manager')
  )
  -- Of de medewerker zelf van deze case
  OR (case_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sick_leave_cases
    WHERE sick_leave_cases.id = documents.case_id
    AND sick_leave_cases.employee_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "HR and case creator can update case documents" ON public.documents;
CREATE POLICY "HR and case creator can update case documents"
ON public.documents FOR UPDATE
USING (
  auth.uid() = uploaded_by
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('hr', 'manager')
  )
);
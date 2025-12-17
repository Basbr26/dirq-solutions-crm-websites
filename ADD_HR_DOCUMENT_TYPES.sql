-- Add new HR document types to the document_type enum
-- This extends the existing enum with HR-specific document types

-- First, we need to add the new values to the enum
-- Note: In PostgreSQL, you can only ADD values to an enum, not remove them

-- Add HR document types to document_type enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'arbeidsovereenkomst' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
    ) THEN
        ALTER TYPE document_type ADD VALUE 'arbeidsovereenkomst';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'nda' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
    ) THEN
        ALTER TYPE document_type ADD VALUE 'nda';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'onboarding_checklist' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
    ) THEN
        ALTER TYPE document_type ADD VALUE 'onboarding_checklist';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'bewijs_van_indiensttreding' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
    ) THEN
        ALTER TYPE document_type ADD VALUE 'bewijs_van_indiensttreding';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'referentie_brief' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
    ) THEN
        ALTER TYPE document_type ADD VALUE 'referentie_brief';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'contract_verlenging' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
    ) THEN
        ALTER TYPE document_type ADD VALUE 'contract_verlenging';
    END IF;
END $$;

-- Add employee_id column to documents table if it doesn't exist
-- This allows documents to be associated with employees directly (not just via cases)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'employee_id'
    ) THEN
        ALTER TABLE documents
        ADD COLUMN employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
        
        -- Add index for better query performance
        CREATE INDEX idx_documents_employee_id ON documents(employee_id);
    END IF;
END $$;

-- Add file_path column (alias for storage path)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'file_path'
    ) THEN
        ALTER TABLE documents ADD COLUMN file_path TEXT;
    END IF;
END $$;

-- Add title column for document display name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE documents ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled';
    END IF;
END $$;

-- Add status column for document workflow
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'draft';
    END IF;
END $$;

-- Add signature tracking columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'requires_signatures'
    ) THEN
        ALTER TABLE documents ADD COLUMN requires_signatures TEXT[];
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'owner_signed'
    ) THEN
        ALTER TABLE documents ADD COLUMN owner_signed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Make case_id nullable since HR documents don't need a case
ALTER TABLE documents ALTER COLUMN case_id DROP NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN documents.employee_id IS 'Direct link to employee for HR documents (arbeidsovereenkomst, NDA, etc). For verzuim documents, use case_id instead.';
COMMENT ON COLUMN documents.case_id IS 'Link to sick leave case for verzuim documents. NULL for HR documents.';
COMMENT ON COLUMN documents.file_path IS 'Storage path in Supabase Storage bucket';
COMMENT ON COLUMN documents.file_url IS 'Legacy column - may contain signed URLs or public URLs';
COMMENT ON COLUMN documents.title IS 'Display name for the document';
COMMENT ON COLUMN documents.status IS 'Document status: draft, completed, archived';

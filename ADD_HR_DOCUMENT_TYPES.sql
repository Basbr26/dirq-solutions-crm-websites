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

-- Make case_id nullable since HR documents don't need a case
ALTER TABLE documents ALTER COLUMN case_id DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN documents.employee_id IS 'Direct link to employee for HR documents (arbeidsovereenkomst, NDA, etc). For verzuim documents, use case_id instead.';
COMMENT ON COLUMN documents.case_id IS 'Link to sick leave case for verzuim documents. NULL for HR documents.';

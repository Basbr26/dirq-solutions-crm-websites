-- Add missing foreign key constraints for company_id
-- These were missing from the original schema

-- Add foreign key for projects.company_id
ALTER TABLE projects 
ADD CONSTRAINT projects_company_id_fkey 
FOREIGN KEY (company_id) 
REFERENCES companies(id) 
ON DELETE CASCADE;

-- Add foreign key for quotes.company_id (if not exists)
-- Note: This one should already exist from the original migration, but we'll add it conditionally
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quotes_company_id_fkey'
  ) THEN
    ALTER TABLE quotes 
    ADD CONSTRAINT quotes_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for projects.contact_id (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_contact_id_fkey'
  ) THEN
    ALTER TABLE projects 
    ADD CONSTRAINT projects_contact_id_fkey 
    FOREIGN KEY (contact_id) 
    REFERENCES contacts(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

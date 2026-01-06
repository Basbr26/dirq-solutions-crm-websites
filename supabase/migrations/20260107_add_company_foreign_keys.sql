-- Add missing foreign key constraints for company_id
-- These were missing from the original schema

-- Step 1: Remove NOT NULL constraint from projects.company_id (projects can exist without a company initially)
ALTER TABLE projects 
ALTER COLUMN company_id DROP NOT NULL;

-- Step 2: Clean up orphaned company_id references in projects
-- Set company_id to NULL for projects where the company doesn't exist
UPDATE projects 
SET company_id = NULL 
WHERE company_id IS NOT NULL 
  AND company_id NOT IN (SELECT id FROM companies);

-- Step 3: Clean up orphaned contact_id references in projects
UPDATE projects 
SET contact_id = NULL 
WHERE contact_id IS NOT NULL 
  AND contact_id NOT IN (SELECT id FROM contacts);

-- Step 4: Add foreign key for projects.company_id
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

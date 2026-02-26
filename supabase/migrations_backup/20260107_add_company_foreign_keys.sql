-- Add missing foreign key constraints for company_id
-- These were missing from the original schema

-- Step 1: Delete projects that reference non-existent companies
-- These are orphaned records that should not exist
DELETE FROM projects 
WHERE company_id IS NOT NULL 
  AND company_id NOT IN (SELECT id FROM companies);

-- Step 2: Delete projects without a company_id (if any exist due to missing NOT NULL constraint)
-- A project MUST have a company
DELETE FROM projects 
WHERE company_id IS NULL;

-- Step 3: Clean up orphaned contact_id references in projects
UPDATE projects 
SET contact_id = NULL 
WHERE contact_id IS NOT NULL 
  AND contact_id NOT IN (SELECT id FROM contacts);

-- Step 4: Ensure company_id is NOT NULL (should already be, but let's be explicit)
ALTER TABLE projects 
ALTER COLUMN company_id SET NOT NULL;

-- Step 5: Add foreign key for projects.company_id
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

-- ============================================================================
-- EMERGENCY FIX: Restore INSERT policies for companies, contacts, interactions
-- ============================================================================
-- Issue: Users cannot add companies, contacts, or activities
-- Root cause: INSERT policies were dropped but not recreated
-- ============================================================================

BEGIN;

-- ============================================================================
-- Companies: Allow authenticated users to insert with themselves as owner
-- ============================================================================

DROP POLICY IF EXISTS companies_insert_policy ON companies;

CREATE POLICY companies_insert_policy ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

-- ============================================================================
-- Contacts: Allow authenticated users to insert with themselves as owner
-- ============================================================================

DROP POLICY IF EXISTS contacts_insert_policy ON contacts;

CREATE POLICY contacts_insert_policy ON contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

-- ============================================================================
-- Interactions: Allow authenticated users to insert with themselves as user
-- ============================================================================

DROP POLICY IF EXISTS interactions_insert_policy ON interactions;

CREATE POLICY interactions_insert_policy ON interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- Leads: Allow authenticated users to insert with themselves as owner
-- ============================================================================

DROP POLICY IF EXISTS leads_insert_policy ON leads;

CREATE POLICY leads_insert_policy ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

-- ============================================================================
-- Projects: Allow authenticated users to insert with themselves as owner
-- ============================================================================

DROP POLICY IF EXISTS projects_insert_policy ON projects;

CREATE POLICY projects_insert_policy ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

-- ============================================================================
-- Quotes: Allow authenticated users to insert with themselves as owner
-- ============================================================================

DROP POLICY IF EXISTS quotes_insert_policy ON quotes;

CREATE POLICY quotes_insert_policy ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

-- ============================================================================
-- Documents: Allow authenticated users to upload documents
-- ============================================================================

DROP POLICY IF EXISTS documents_insert_policy ON documents;

CREATE POLICY documents_insert_policy ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = (select auth.uid()));

-- ============================================================================
-- Tasks: Allow authenticated users to create tasks assigned to themselves
-- ============================================================================

DROP POLICY IF EXISTS tasks_insert_policy ON tasks;

CREATE POLICY tasks_insert_policy ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (assigned_to = (select auth.uid()));

-- ============================================================================
-- Calendar Events: Allow authenticated users to create their own events
-- ============================================================================

DROP POLICY IF EXISTS calendar_events_insert_policy ON calendar_events;

CREATE POLICY calendar_events_insert_policy ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- Email Drafts: Allow authenticated users to create email drafts
-- ============================================================================

DROP POLICY IF EXISTS email_drafts_insert_policy ON email_drafts;

CREATE POLICY email_drafts_insert_policy ON email_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- No specific owner column, allow all authenticated users

COMMIT;

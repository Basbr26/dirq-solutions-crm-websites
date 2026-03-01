-- ============================================================
-- FIX RLS PERFORMANCE WARNINGS
-- Created: 2026-03-01
--
-- Fixes two categories of warnings from Supabase Database Linter:
--
-- 1. auth_rls_initplan: auth.uid() re-evaluated per row
--    Root cause: chat tables (20260129) and _authenticated_insert
--    policies created without the (select auth.uid()) wrapper.
--    Fix: DROP + recreate with (select auth.uid())
--
-- 2. multiple_permissive_policies: duplicate overlapping policies
--    Root cause: layered migrations left 2-3 INSERT policies per
--    table with identical semantics.
--    Fix: drop extras, keep one consolidated policy per action.
--
-- All DROPs use IF EXISTS — safe to run multiple times.
-- No behavioral change, pure performance fix.
-- ============================================================


-- ============================================================
-- PART 1: CHAT TABLES
-- Created in 20260129_create_chat_tables.sql without (select)
-- wrapper. Rebuild all 8 policies.
-- ============================================================

-- chat_sessions (4 policies)
DROP POLICY IF EXISTS "Users can view own chat sessions"   ON chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;

CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- chat_messages (2 policies)
DROP POLICY IF EXISTS "Users can view own chat messages"   ON chat_messages;
DROP POLICY IF EXISTS "Users can create own chat messages" ON chat_messages;

CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own chat messages" ON chat_messages
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- chat_feedback (2 policies)
DROP POLICY IF EXISTS "Users can view own feedback"   ON chat_feedback;
DROP POLICY IF EXISTS "Users can create own feedback" ON chat_feedback;

CREATE POLICY "Users can view own feedback" ON chat_feedback
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own feedback" ON chat_feedback
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);


-- ============================================================
-- PART 2: CRM TABLES — consolidate duplicate INSERT policies
--
-- History: each table ended up with 3 overlapping INSERT policies:
--   - insert_own_X        (20260123, uses (select auth.uid()))
--   - X_insert_policy     (20260124 emergency, uses (select auth.uid()))
--   - X_authenticated_insert (added later, uses plain auth.uid())
--
-- Fix: drop all 3, recreate X_authenticated_insert with (select).
-- contacts/interactions/leads/projects/quotes also have duplicate
-- SELECT policies — same consolidation applied.
-- ============================================================

-- COMPANIES (INSERT only — SELECT already single policy)
DROP POLICY IF EXISTS "insert_own_companies"      ON companies;
DROP POLICY IF EXISTS companies_insert_policy     ON companies;
DROP POLICY IF EXISTS companies_authenticated_insert ON companies;

CREATE POLICY companies_authenticated_insert ON companies
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

-- CONTACTS (INSERT + SELECT)
DROP POLICY IF EXISTS "select_own_contacts"       ON contacts;
DROP POLICY IF EXISTS "insert_own_contacts"       ON contacts;
DROP POLICY IF EXISTS contacts_insert_policy      ON contacts;
DROP POLICY IF EXISTS contacts_authenticated_insert ON contacts;
DROP POLICY IF EXISTS contacts_authenticated_select ON contacts;

CREATE POLICY contacts_authenticated_insert ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY contacts_authenticated_select ON contacts
  FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()));

-- INTERACTIONS (INSERT + SELECT; uses user_id not owner_id)
DROP POLICY IF EXISTS "insert_own_interactions"       ON interactions;
DROP POLICY IF EXISTS interactions_insert_policy      ON interactions;
DROP POLICY IF EXISTS "Interactions insert policy"    ON interactions;
DROP POLICY IF EXISTS interactions_authenticated_insert ON interactions;
DROP POLICY IF EXISTS "select_own_interactions"       ON interactions;
DROP POLICY IF EXISTS interactions_authenticated_select ON interactions;

CREATE POLICY interactions_authenticated_insert ON interactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY interactions_authenticated_select ON interactions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- LEADS (INSERT + SELECT)
DROP POLICY IF EXISTS "insert_own_leads"       ON leads;
DROP POLICY IF EXISTS leads_insert_policy      ON leads;
DROP POLICY IF EXISTS leads_authenticated_insert ON leads;
DROP POLICY IF EXISTS "select_own_leads"       ON leads;
DROP POLICY IF EXISTS leads_authenticated_select ON leads;

CREATE POLICY leads_authenticated_insert ON leads
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY leads_authenticated_select ON leads
  FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()));

-- PROJECTS (INSERT + SELECT)
DROP POLICY IF EXISTS "insert_own_projects"       ON projects;
DROP POLICY IF EXISTS projects_insert_policy      ON projects;
DROP POLICY IF EXISTS projects_authenticated_insert ON projects;
DROP POLICY IF EXISTS "select_own_projects"       ON projects;
DROP POLICY IF EXISTS projects_authenticated_select ON projects;

CREATE POLICY projects_authenticated_insert ON projects
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY projects_authenticated_select ON projects
  FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()));

-- QUOTES (INSERT + SELECT)
DROP POLICY IF EXISTS "insert_own_quotes"       ON quotes;
DROP POLICY IF EXISTS quotes_insert_policy      ON quotes;
DROP POLICY IF EXISTS quotes_authenticated_insert ON quotes;
DROP POLICY IF EXISTS "select_own_quotes"       ON quotes;
DROP POLICY IF EXISTS quotes_authenticated_select ON quotes;

CREATE POLICY quotes_authenticated_insert ON quotes
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY quotes_authenticated_select ON quotes
  FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()));

-- DOCUMENTS (INSERT only; uses uploaded_by)
DROP POLICY IF EXISTS documents_insert_policy       ON documents;
DROP POLICY IF EXISTS documents_authenticated_insert ON documents;

CREATE POLICY documents_authenticated_insert ON documents
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = (select auth.uid()));

-- TASKS (INSERT only; uses assigned_to)
DROP POLICY IF EXISTS tasks_insert_policy       ON tasks;
DROP POLICY IF EXISTS tasks_authenticated_insert ON tasks;

CREATE POLICY tasks_authenticated_insert ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (assigned_to = (select auth.uid()));


-- ============================================================
-- PART 3: CALENDAR EVENTS
-- Duplicate INSERT: calendar_events_authenticated_insert + create_own_calendar_events
-- Duplicate SELECT: calendar_events_authenticated_select + view_own_calendar_events
-- Both use user_id column.
-- ============================================================
DROP POLICY IF EXISTS calendar_events_insert_policy       ON calendar_events;
DROP POLICY IF EXISTS calendar_events_authenticated_insert ON calendar_events;
DROP POLICY IF EXISTS "create_own_calendar_events"        ON calendar_events;
DROP POLICY IF EXISTS calendar_events_authenticated_select ON calendar_events;
DROP POLICY IF EXISTS "view_own_calendar_events"          ON calendar_events;

CREATE POLICY calendar_events_authenticated_insert ON calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY calendar_events_authenticated_select ON calendar_events
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));


-- ============================================================
-- PART 4: ATC TABLES
--
-- Problem A: "Service role full access" uses auth.role()/current_setting()
--   per row. service_role bypasses RLS entirely — policy is dead code.
--   Fix: DROP it.
--
-- Problem B: "Admins can view" overlaps with above on SELECT for all roles.
--   Fix: keep it, but rebuild with (select auth.uid()) wrapper.
-- ============================================================

-- atc_processed_events
DROP POLICY IF EXISTS "Service role full access on atc_processed_events" ON atc_processed_events;
DROP POLICY IF EXISTS "Admins can view atc_processed_events"             ON atc_processed_events;

CREATE POLICY "Admins can view atc_processed_events" ON atc_processed_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('ADMIN', 'super_admin')
    )
  );

-- atc_failed_events
DROP POLICY IF EXISTS "Service role full access on atc_failed_events" ON atc_failed_events;
DROP POLICY IF EXISTS "Admins can view atc_failed_events"             ON atc_failed_events;

CREATE POLICY "Admins can view atc_failed_events" ON atc_failed_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('ADMIN', 'super_admin')
    )
  );

-- atc_circuit_breaker
DROP POLICY IF EXISTS "Service role full access on atc_circuit_breaker" ON atc_circuit_breaker;
DROP POLICY IF EXISTS "Admins can view atc_circuit_breaker"             ON atc_circuit_breaker;

CREATE POLICY "Admins can view atc_circuit_breaker" ON atc_circuit_breaker
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('ADMIN', 'super_admin')
    )
  );


-- ============================================================
-- VERIFICATIE
-- Run in SQL Editor om te controleren na toepassen:
--
-- 1. Geen dubbele policies meer:
-- SELECT tablename, cmd, COUNT(*) as n
-- FROM pg_policies WHERE schemaname = 'public'
-- GROUP BY tablename, cmd HAVING COUNT(*) > 1
-- ORDER BY tablename, cmd;
--
-- 2. Geen plain auth.uid() meer (zou 0 rijen moeten geven):
-- SELECT tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
--   AND qual NOT LIKE '%(select auth.uid())%'
--   AND with_check NOT LIKE '%(select auth.uid())%';
-- ============================================================

SELECT 'RLS performance warnings fixed!' AS status;

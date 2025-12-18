-- ============================================================
-- 🔒 FIX MISSING RLS POLICIES
-- ============================================================
-- These tables have RLS enabled but no policies, making them inaccessible
-- Tables: escalation_history, notification_logs, workflow_execution_steps, workflow_executions
-- ============================================================

-- ============================================
-- NOTIFICATION_LOGS POLICIES
-- ============================================

CREATE POLICY "Admins can view all notification logs"
  ON notification_logs FOR SELECT
  USING (
    public.get_user_role() IN ('super_admin', 'admin')
  );

CREATE POLICY "HR can view notification logs"
  ON notification_logs FOR SELECT
  USING (
    public.get_user_role() = 'hr'
  );

CREATE POLICY "Users can view their own notification logs"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_logs.notification_id
      AND n.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert notification logs"
  ON notification_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update notification logs"
  ON notification_logs FOR UPDATE
  USING (true);

-- ============================================
-- ESCALATION_HISTORY POLICIES
-- ============================================

CREATE POLICY "Admins can view all escalation history"
  ON escalation_history FOR SELECT
  USING (
    public.get_user_role() IN ('super_admin', 'admin')
  );

CREATE POLICY "HR can view escalation history"
  ON escalation_history FOR SELECT
  USING (
    public.get_user_role() = 'hr'
  );

CREATE POLICY "Managers can view escalation history"
  ON escalation_history FOR SELECT
  USING (
    public.get_user_role() = 'manager'
  );

CREATE POLICY "Users can view their own escalation history"
  ON escalation_history FOR SELECT
  USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

CREATE POLICY "System can insert escalation history"
  ON escalation_history FOR INSERT
  WITH CHECK (true);

-- ============================================
-- WORKFLOW_EXECUTIONS POLICIES
-- ============================================

CREATE POLICY "Admins can view all workflow executions"
  ON workflow_executions FOR SELECT
  USING (
    public.get_user_role() IN ('super_admin', 'admin')
  );

CREATE POLICY "HR can view workflow executions"
  ON workflow_executions FOR SELECT
  USING (
    public.get_user_role() = 'hr'
  );

CREATE POLICY "Users can view workflow executions they triggered"
  ON workflow_executions FOR SELECT
  USING (
    triggered_by = auth.uid()
  );

CREATE POLICY "Admins can insert workflow executions"
  ON workflow_executions FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('super_admin', 'admin', 'hr')
  );

CREATE POLICY "Admins can update workflow executions"
  ON workflow_executions FOR UPDATE
  USING (
    public.get_user_role() IN ('super_admin', 'admin', 'hr')
  );

CREATE POLICY "System can update workflow execution status"
  ON workflow_executions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- WORKFLOW_EXECUTION_STEPS POLICIES
-- ============================================

CREATE POLICY "Admins can view all workflow execution steps"
  ON workflow_execution_steps FOR SELECT
  USING (
    public.get_user_role() IN ('super_admin', 'admin')
  );

CREATE POLICY "HR can view workflow execution steps"
  ON workflow_execution_steps FOR SELECT
  USING (
    public.get_user_role() = 'hr'
  );

CREATE POLICY "Users can view steps from their workflow executions"
  ON workflow_execution_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflow_executions we
      WHERE we.id = workflow_execution_steps.execution_id
      AND we.triggered_by = auth.uid()
    )
  );

CREATE POLICY "System can insert workflow execution steps"
  ON workflow_execution_steps FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update workflow execution steps"
  ON workflow_execution_steps FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that all tables now have policies
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('escalation_history', 'notification_logs', 'workflow_execution_steps', 'workflow_executions')
GROUP BY tablename
ORDER BY tablename;

-- Confirm no tables are still blocked
SELECT 
  tablename,
  '❌ STILL BLOCKED' as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
  AND tablename NOT IN (
    SELECT DISTINCT tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  )
ORDER BY tablename;

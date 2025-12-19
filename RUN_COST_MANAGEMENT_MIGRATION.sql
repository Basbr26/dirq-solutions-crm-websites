-- ============================================================
-- 🚀 COST MANAGEMENT MIGRATION RUNNER
-- ============================================================
-- Run this in Supabase SQL Editor to enable the Cost Analytics page
--
-- This will execute: supabase/migrations/20251218_company_cost_management.sql
-- ============================================================

-- Check if migration is needed
DO $$
BEGIN
  -- Check if employee_cost_summary table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'employee_cost_summary'
  ) THEN
    RAISE NOTICE '⚠️  Migration needed: employee_cost_summary table does not exist';
    RAISE NOTICE '📋 Please run the full migration file manually';
    RAISE NOTICE '';
    RAISE NOTICE '👉 Location: supabase/migrations/20251218_company_cost_management.sql';
    RAISE NOTICE '';
    RAISE NOTICE 'Or run this file if you want to execute it automatically.';
  ELSE
    RAISE NOTICE '✅ Migration already applied: employee_cost_summary exists';
  END IF;
  
  -- Check if view exists
  IF NOT EXISTS (
    SELECT FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'v_employee_total_compensation'
  ) THEN
    RAISE NOTICE '⚠️  Migration needed: v_employee_total_compensation view does not exist';
  ELSE
    RAISE NOTICE '✅ View exists: v_employee_total_compensation';
  END IF;
END $$;

-- ============================================================
-- INSTRUCTIONS:
-- ============================================================
-- 
-- Option 1 (Recommended): Run the full migration file
-- ------------------------------------------------
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Create new query
-- 3. Copy contents from: supabase/migrations/20251218_company_cost_management.sql
-- 4. Click "Run"
-- 
-- Option 2: Use Supabase CLI
-- -------------------------
-- Run in terminal:
-- supabase db push
-- 
-- ============================================================

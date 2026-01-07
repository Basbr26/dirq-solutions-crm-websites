-- =============================================
-- ADD INTERACTIONS SELECT POLICY
-- =============================================
-- Datum: 7 januari 2026
-- Probleem: 403 Forbidden bij ophalen interactions (SELECT)
-- Oorzaak: Geen SELECT policy
-- Oplossing: Maak SELECT policy aan
-- =============================================

BEGIN;

-- =============================================
-- CREATE INTERACTIONS SELECT POLICY
-- =============================================

-- SELECT:
-- - Users can see interactions for companies they have access to
-- - Users can see their own interactions
-- - ADMIN/MANAGER can see all interactions
CREATE POLICY "Interactions select policy"
  ON interactions FOR SELECT
  TO authenticated
  USING (
    -- ADMIN/MANAGER zien alles
    is_admin_or_manager()
    -- Of: het is je eigen interaction
    OR user_id = auth.uid()
    -- Of: je hebt toegang tot de company
    OR (
      company_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM companies 
        WHERE companies.id = interactions.company_id
        -- Companies zijn zichtbaar voor iedereen (SELECT policy is "true")
      )
    )
    -- Of: je hebt toegang tot de lead (owner of admin)
    OR (
      lead_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM leads
        WHERE leads.id = interactions.lead_id
        AND (
          is_admin_or_manager()
          OR leads.owner_id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- VERIFICATIE
-- =============================================

-- Check of policy bestaat
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'interactions'
    AND policyname = 'Interactions select policy'
    AND cmd = 'SELECT';
    
  IF policy_count = 1 THEN
    RAISE NOTICE '✅ Interactions SELECT policy successfully created';
  ELSE
    RAISE WARNING '❌ Policy not found after creation!';
  END IF;
END $$;

COMMIT;

-- =============================================
-- EINDE VAN FIX
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Interactions SELECT Policy Created';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now:';
  RAISE NOTICE '- See their own interactions';
  RAISE NOTICE '- See interactions for companies they can view';
  RAISE NOTICE '- See interactions for leads they own';
  RAISE NOTICE '- ADMIN/MANAGER can see all interactions';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Test viewing interactions in CRM';
END $$;

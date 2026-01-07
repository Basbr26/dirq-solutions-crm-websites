-- =============================================
-- FIX INTERACTIONS RLS POLICIES
-- =============================================
-- Datum: 7 januari 2026
-- Probleem: 403 Forbidden bij aanmaken interactions
-- Oorzaak: INSERT policy te restrictief (vereist company ownership)
-- Oplossing: Sta toe dat gebruikers interactions aanmaken voor companies die ze kunnen zien
-- =============================================

BEGIN;

-- =============================================
-- DROP EN HERMAAK INTERACTIONS INSERT POLICY
-- =============================================

DROP POLICY IF EXISTS "Interactions insert policy" ON interactions;

-- INSERT:
-- - All authenticated users can create interactions
-- - Must be assigned to creator
-- - Simplified: Als je de company/lead kunt ZIEN, mag je een interaction aanmaken
CREATE POLICY "Interactions insert policy"
  ON interactions FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User moet zichzelf toewijzen
    user_id = auth.uid()
    AND (
      -- Als er geen company_id is, allow (voor standalone notes)
      company_id IS NULL
      -- Anders: Check of je de company kunt zien
      OR EXISTS (
        SELECT 1 FROM companies 
        WHERE companies.id = interactions.company_id
        -- ADMIN/MANAGER zien alles
        AND (
          is_admin_or_manager()
          -- SALES ziet alle companies (volgend SELECT policy)
          OR true  -- Companies SELECT policy is "true" voor iedereen
        )
      )
    )
    AND (
      -- Als er geen lead_id is, allow
      lead_id IS NULL
      -- Anders: Check of je de lead kunt zien (owner of admin)
      OR EXISTS (
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
    AND policyname = 'Interactions insert policy'
    AND cmd = 'INSERT';
    
  IF policy_count = 1 THEN
    RAISE NOTICE '✅ Interactions INSERT policy successfully updated';
  ELSE
    RAISE WARNING '❌ Policy not found after update!';
  END IF;
END $$;

COMMIT;

-- =============================================
-- TEST SCENARIO
-- =============================================
/*

-- Als SALES user, zou je nu moeten kunnen:

1. Interaction aanmaken voor ELKE company (niet alleen eigen companies):
   INSERT INTO interactions (
     company_id, 
     user_id, 
     type, 
     subject, 
     description
   ) VALUES (
     '[any-company-uuid]',
     auth.uid(),
     'note',
     'Test notitie',
     'Dit zou moeten werken'
   );

2. Interaction aanmaken zonder company (standalone note):
   INSERT INTO interactions (
     user_id,
     type,
     subject,
     description
   ) VALUES (
     auth.uid(),
     'note',
     'Standalone notitie',
     'Geen company gekoppeld'
   );

3. Interaction aanmaken voor lead die je ownt:
   INSERT INTO interactions (
     lead_id,
     user_id,
     type,
     subject
   ) VALUES (
     '[owned-lead-uuid]',
     auth.uid(),
     'call',
     'Follow-up call'
   );

*/

-- =============================================
-- EINDE VAN FIX
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Interactions RLS Policy Fixed';
  RAISE NOTICE '';
  RAISE NOTICE 'Changelog:';
  RAISE NOTICE '- Simplified INSERT check: if you can SEE the company, you can add interactions';
  RAISE NOTICE '- Removed ownership requirement for company_id';
  RAISE NOTICE '- Kept requirement: user_id must be auth.uid()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test creating interactions from CRM';
  RAISE NOTICE '2. Test task creation';
  RAISE NOTICE '3. Verify SUPPORT role can still create interactions';
END $$;

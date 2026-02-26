-- =============================================
-- FIX is_admin_or_manager FUNCTION
-- =============================================
-- Datum: 7 januari 2026
-- Probleem: Function herkent super_admin niet
-- Oplossing: Voeg super_admin toe aan check
-- =============================================

BEGIN;

-- Drop en hermaak de functie
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('ADMIN', 'MANAGER', 'super_admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Verificatie
DO $$
BEGIN
  RAISE NOTICE '✅ is_admin_or_manager() function updated';
  RAISE NOTICE 'Now recognizes: ADMIN, MANAGER, super_admin';
END $$;

COMMIT;

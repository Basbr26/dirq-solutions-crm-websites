-- ============================================================
-- 🔄 COLUMN COMPATIBILITY LAYER
-- ============================================================
-- This creates virtual columns (voornaam, achternaam, geboortedatum)
-- that map to the new column names (full_name, birth_date)
-- This prevents breaking ALL frontend code at once
-- ============================================================

-- Add computed columns for backward compatibility
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS voornaam VARCHAR(255) 
  GENERATED ALWAYS AS (
    CASE 
      WHEN full_name IS NOT NULL THEN split_part(full_name, ' ', 1)
      ELSE NULL 
    END
  ) STORED;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS achternaam VARCHAR(255) 
  GENERATED ALWAYS AS (
    CASE 
      WHEN full_name IS NOT NULL AND array_length(string_to_array(full_name, ' '), 1) > 1 
      THEN substring(full_name from length(split_part(full_name, ' ', 1)) + 2)
      ELSE NULL 
    END
  ) STORED;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS geboortedatum DATE 
  GENERATED ALWAYS AS (birth_date) STORED;

-- Create indexes on computed columns
CREATE INDEX IF NOT EXISTS idx_profiles_voornaam ON profiles(voornaam);
CREATE INDEX IF NOT EXISTS idx_profiles_achternaam ON profiles(achternaam);
CREATE INDEX IF NOT EXISTS idx_profiles_geboortedatum ON profiles(geboortedatum);

COMMENT ON COLUMN profiles.voornaam IS 'Computed column for backward compatibility - maps to first word of full_name';
COMMENT ON COLUMN profiles.achternaam IS 'Computed column for backward compatibility - maps to remaining words of full_name';
COMMENT ON COLUMN profiles.geboortedatum IS 'Computed column for backward compatibility - maps to birth_date';

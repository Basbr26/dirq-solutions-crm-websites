  -- Prospect Outreach Fields
  -- Bijhouden waar een lead vandaan komt en wat de outreach-status is.
  -- Gebruikt door de geautomatiseerde KVK + Google Places lead-gen pipelines.

  ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS lead_source      TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS outreach_status  TEXT NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS google_place_id  TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS kvk_number       TEXT DEFAULT NULL;

  -- Deduplicatie: voorkom dubbele Google Places bedrijven
  CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_google_place_id
    ON companies(google_place_id)
    WHERE google_place_id IS NOT NULL;

  -- Index voor KVK deduplicatie
  CREATE INDEX IF NOT EXISTS idx_companies_kvk_number
    ON companies(kvk_number)
    WHERE kvk_number IS NOT NULL;

  -- Filtering op lead_source (voor CRM-overzicht per pipeline)
  CREATE INDEX IF NOT EXISTS idx_companies_lead_source
    ON companies(lead_source)
    WHERE lead_source IS NOT NULL;

  -- Filtering op outreach_status (welke prospects nog niet benaderd?)
  CREATE INDEX IF NOT EXISTS idx_companies_outreach_status
    ON companies(outreach_status)
    WHERE outreach_status != 'none';

  -- Geldige waarden voor outreach_status
  -- none → intro_sent → follow_up_sent → responded → meeting_set → lost
  COMMENT ON COLUMN companies.lead_source IS
    'Herkomst van de lead: kvk_finance | kvk_auto | google_maps | NULL (handmatig)';

  COMMENT ON COLUMN companies.outreach_status IS
    'Status van de sales-outreach: none | intro_sent | follow_up_sent | responded | meeting_set | lost';

  COMMENT ON COLUMN companies.google_place_id IS
    'Google Places place_id voor deduplicatie (bijv. ChIJplace001)';

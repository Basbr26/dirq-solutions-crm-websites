-- Contract velden voor projecten
-- Voegt contract_end_date toe voor de ATC - Contract Renewal Tracker

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_notes text;

-- Index voor snelle queries op lopende contracten
CREATE INDEX IF NOT EXISTS idx_projects_contract_end_date
  ON projects(contract_end_date)
  WHERE contract_end_date IS NOT NULL AND stage = 'live';

COMMENT ON COLUMN projects.contract_end_date IS 'Einddatum van het lopende onderhouds- of servicecontract. Gebruikt door ATC - Contract Renewal Tracker voor 90/60/30 dag alerts.';
COMMENT ON COLUMN projects.contract_start_date IS 'Startdatum van het huidige contract.';
COMMENT ON COLUMN projects.contract_notes IS 'Notities over contractvoorwaarden, verlengingsafspraken, etc.';

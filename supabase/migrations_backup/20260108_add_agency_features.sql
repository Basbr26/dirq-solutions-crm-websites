-- Extend interactions table for Video Audit workflow
-- Add BTW automation to quotes table
-- Add hosting/domain tracking to projects table
-- Reported in: Agency Upgrade Requirements

-- ============================================
-- PART 1: VIDEO AUDIT WORKFLOW
-- ============================================

-- Add video audit fields to interactions
ALTER TABLE interactions
ADD COLUMN IF NOT EXISTS video_audit_url TEXT,
ADD COLUMN IF NOT EXISTS video_audit_script TEXT,
ADD COLUMN IF NOT EXISTS video_platform TEXT CHECK (video_platform IN ('loom', 'youtube', 'vimeo', 'other'));

-- Create index for video audits
CREATE INDEX idx_interactions_video_audits ON interactions(type, video_audit_url) 
  WHERE type = 'video_audit' AND video_audit_url IS NOT NULL;

-- Add video_audit to interaction type check constraint
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_type_check;
ALTER TABLE interactions 
ADD CONSTRAINT interactions_type_check 
CHECK (type IN ('call', 'email', 'meeting', 'note', 'linkedin_video', 'physical_mail', 'direct_message', 'video_audit'));

-- ============================================
-- PART 2: BTW AUTOMATION IN QUOTES
-- ============================================

-- Add financial breakdown fields to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS btw_percentage DECIMAL(5, 2) DEFAULT 21.00,
ADD COLUMN IF NOT EXISTS btw_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS total_incl_btw DECIMAL(10, 2);

-- Create function to auto-calculate BTW
CREATE OR REPLACE FUNCTION calculate_quote_btw()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If subtotal is provided, calculate BTW
  IF NEW.subtotal IS NOT NULL THEN
    NEW.btw_amount := NEW.subtotal * (NEW.btw_percentage / 100);
    NEW.total_incl_btw := NEW.subtotal + NEW.btw_amount;
  -- If total_amount exists but subtotal doesn't, reverse calculate
  ELSIF NEW.total_amount IS NOT NULL AND NEW.subtotal IS NULL THEN
    NEW.total_incl_btw := NEW.total_amount;
    NEW.subtotal := NEW.total_amount / (1 + (NEW.btw_percentage / 100));
    NEW.btw_amount := NEW.total_amount - NEW.subtotal;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_quote_btw
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_btw();

-- Create accounting export view
CREATE OR REPLACE VIEW quotes_for_accounting AS
SELECT 
  q.id,
  q.quote_number,
  c.naam AS company_name,
  c.kvk_number,
  c.btw_number,
  q.subtotal AS bedrag_excl_btw,
  q.btw_percentage,
  q.btw_amount AS btw_bedrag,
  q.total_incl_btw AS bedrag_incl_btw,
  q.status,
  q.created_at AS datum,
  q.valid_until AS geldig_tot,
  CASE 
    WHEN q.status = 'accepted' THEN 'Te factureren'
    WHEN q.status = 'invoiced' THEN 'Gefactureerd'
    ELSE 'Offerte'
  END AS boekhouding_status
FROM quotes q
JOIN companies c ON c.id = q.company_id
WHERE q.status IN ('accepted', 'invoiced')
ORDER BY q.created_at DESC;

-- ============================================
-- PART 3: HOSTING & DOMAIN TRACKING
-- ============================================

-- Add hosting/domain fields to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS domain_name TEXT,
ADD COLUMN IF NOT EXISTS domain_registrar TEXT,
ADD COLUMN IF NOT EXISTS domain_expiry_date DATE,
ADD COLUMN IF NOT EXISTS hosting_provider TEXT DEFAULT 'TransIP',
ADD COLUMN IF NOT EXISTS hosting_package TEXT,
ADD COLUMN IF NOT EXISTS ssl_status TEXT CHECK (ssl_status IN ('active', 'expiring_soon', 'expired', 'not_configured')) DEFAULT 'not_configured',
ADD COLUMN IF NOT EXISTS ssl_expiry_date DATE,
ADD COLUMN IF NOT EXISTS dns_configured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dns_records JSONB, -- Store DNS records as JSON
ADD COLUMN IF NOT EXISTS hosting_api_key_id TEXT, -- Reference to encrypted key in vault
ADD COLUMN IF NOT EXISTS site_status TEXT CHECK (site_status IN ('up', 'down', 'maintenance', 'unknown')) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS last_uptime_check TIMESTAMPTZ;

-- Create index for domain expiry monitoring
CREATE INDEX idx_projects_domain_expiry ON projects(domain_expiry_date) 
  WHERE domain_expiry_date IS NOT NULL;

CREATE INDEX idx_projects_ssl_expiry ON projects(ssl_expiry_date) 
  WHERE ssl_expiry_date IS NOT NULL;

-- Create view for expiring domains & SSL
CREATE OR REPLACE VIEW expiring_services AS
SELECT 
  p.id,
  p.naam AS project_name,
  c.naam AS company_name,
  'domain' AS service_type,
  p.domain_name AS service_name,
  p.domain_expiry_date AS expiry_date,
  EXTRACT(DAY FROM (p.domain_expiry_date - CURRENT_DATE))::INTEGER AS days_until_expiry
FROM projects p
JOIN companies c ON c.id = p.company_id
WHERE p.domain_expiry_date IS NOT NULL
  AND p.domain_expiry_date <= CURRENT_DATE + INTERVAL '60 days'

UNION ALL

SELECT 
  p.id,
  p.naam,
  c.naam,
  'ssl' AS service_type,
  p.domain_name,
  p.ssl_expiry_date,
  EXTRACT(DAY FROM (p.ssl_expiry_date - CURRENT_DATE))::INTEGER
FROM projects p
JOIN companies c ON c.id = p.company_id
WHERE p.ssl_expiry_date IS NOT NULL
  AND p.ssl_expiry_date <= CURRENT_DATE + INTERVAL '30 days'

ORDER BY expiry_date ASC;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN interactions.video_audit_url IS 
'URL naar Loom/YouTube video audit voor LinkedIn outreach';

COMMENT ON COLUMN interactions.video_audit_script IS 
'AI-generated script voor video audit (3 stappen: probleem, oplossing, CTA)';

COMMENT ON COLUMN quotes.subtotal IS 
'Bedrag exclusief BTW - basis voor BTW berekening';

COMMENT ON COLUMN quotes.btw_amount IS 
'Automatisch berekend: subtotal * (btw_percentage / 100)';

COMMENT ON COLUMN quotes.total_incl_btw IS 
'Automatisch berekend: subtotal + btw_amount';

COMMENT ON VIEW quotes_for_accounting IS 
'Export-ready view met alle financiële data voor de boekhouding';

COMMENT ON COLUMN projects.dns_records IS 
'JSON object met DNS records (A, CNAME, MX, TXT records)';

COMMENT ON COLUMN projects.hosting_api_key_id IS 
'Reference naar encrypted TransIP API key in Supabase Vault';

COMMENT ON COLUMN projects.site_status IS 
'Real-time uptime status - kan worden gevuld via TransIP API of externe monitoring';

COMMENT ON VIEW expiring_services IS 
'Dashboard view met domeinen en SSL certificaten die binnenkort verlopen';

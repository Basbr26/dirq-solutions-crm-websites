-- ============================================
-- E-SIGN SYSTEM & AGENT-CENTRIC ARCHITECTURE
-- Migration: 20260108_esign_agent_system.sql
-- ============================================

-- ============================================
-- PART 1: ENHANCED DOCUMENT STATUS & SIGNING
-- ============================================

-- Create document status enum
DO $$ BEGIN
  CREATE TYPE document_status AS ENUM (
    'concept',      -- Draft document
    'pending',      -- Uploaded, awaiting review
    'sent',         -- Sent to client for signature
    'viewed',       -- Client has opened the document
    'signed',       -- Client has signed
    'declined',     -- Client declined to sign
    'expired',      -- Sign link expired
    'archived'      -- Archived/completed
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to documents table for E-Sign
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS public_sign_token uuid DEFAULT gen_random_uuid() UNIQUE,
ADD COLUMN IF NOT EXISTS sign_link_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS sign_link_created_at timestamptz,

-- Signature data
ADD COLUMN IF NOT EXISTS signature_data text,  -- Base64 signature image
ADD COLUMN IF NOT EXISTS signed_at timestamptz,
ADD COLUMN IF NOT EXISTS signed_by_name text,
ADD COLUMN IF NOT EXISTS signed_by_email text,
ADD COLUMN IF NOT EXISTS signed_file_path text,  -- Path to signed PDF

-- Owner signature (internal)
ADD COLUMN IF NOT EXISTS owner_signed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS owner_signature_data text,
ADD COLUMN IF NOT EXISTS owner_signed_at timestamptz,

-- Audit trail
ADD COLUMN IF NOT EXISTS signer_ip_address inet,
ADD COLUMN IF NOT EXISTS signer_user_agent text,
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verification_code text,
ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,

-- Webhook integration
ADD COLUMN IF NOT EXISTS webhook_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS webhook_response jsonb;

-- Create index for public sign token lookups
CREATE INDEX IF NOT EXISTS idx_documents_public_sign_token 
ON documents(public_sign_token) 
WHERE public_sign_token IS NOT NULL;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Create index for sign link expiry monitoring
CREATE INDEX IF NOT EXISTS idx_documents_sign_link_expires 
ON documents(sign_link_expires_at) 
WHERE sign_link_expires_at IS NOT NULL;

-- ============================================
-- PART 2: DOCUMENT SIGNING AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS document_signing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  -- Document reference
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Audit event type
  event_type text NOT NULL CHECK (event_type IN (
    'link_generated',
    'link_accessed',
    'document_viewed',
    'email_sent',
    'email_verified',
    'signature_started',
    'signature_completed',
    'signature_declined',
    'link_expired',
    'webhook_triggered'
  )),
  
  -- Actor information
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email text,
  actor_ip inet,
  actor_user_agent text,
  
  -- Event metadata
  metadata jsonb DEFAULT '{}',
  
  -- Geolocation (optional)
  geo_country text,
  geo_city text
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_document_signing_audit_document 
ON document_signing_audit(document_id);

CREATE INDEX IF NOT EXISTS idx_document_signing_audit_created 
ON document_signing_audit(created_at DESC);

-- RLS for audit log
ALTER TABLE document_signing_audit ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view audit logs
CREATE POLICY "Authenticated users can view audit logs"
ON document_signing_audit FOR SELECT
TO authenticated
USING (true);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON document_signing_audit FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- PART 3: AGENT COMMAND LOG
-- ============================================

CREATE TABLE IF NOT EXISTS agent_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  -- Command details
  raw_input text NOT NULL,  -- Original user input
  parsed_intent text,       -- Detected intent (create_task, update_deal, etc.)
  parsed_entities jsonb,    -- Extracted entities {name, date, etc.}
  
  -- Execution status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  )),
  
  -- Result
  result jsonb,
  error_message text,
  
  -- Source
  source text NOT NULL DEFAULT 'command_bar' CHECK (source IN (
    'command_bar',
    'webhook',
    'n8n',
    'manus',
    'gemini',
    'api'
  )),
  
  -- User context
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_context jsonb,  -- Current page, selected entity, etc.
  
  -- Webhook response
  webhook_url text,
  webhook_response jsonb,
  webhook_sent_at timestamptz
);

-- Indexes for agent commands
CREATE INDEX IF NOT EXISTS idx_agent_commands_user ON agent_commands(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_status ON agent_commands(status);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created ON agent_commands(created_at DESC);

-- RLS for agent commands
ALTER TABLE agent_commands ENABLE ROW LEVEL SECURITY;

-- Users can view their own commands
CREATE POLICY "Users can view own commands"
ON agent_commands FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create commands
CREATE POLICY "Users can create commands"
ON agent_commands FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- System can update commands
CREATE POLICY "System can update commands"
ON agent_commands FOR UPDATE
TO authenticated
USING (true);

-- ============================================
-- PART 4: WEBHOOK CONFIGURATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Webhook details
  name text NOT NULL,
  description text,
  url text NOT NULL,
  secret text,  -- For HMAC signing
  
  -- Trigger conditions
  trigger_event text NOT NULL CHECK (trigger_event IN (
    'document.signed',
    'document.declined',
    'document.expired',
    'deal.won',
    'deal.lost',
    'task.created',
    'task.completed',
    'company.created',
    'contact.created',
    'command.received',
    'custom'
  )),
  
  -- Filters (JSON for flexible filtering)
  filters jsonb DEFAULT '{}',
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Stats
  last_triggered_at timestamptz,
  total_triggers integer DEFAULT 0,
  total_failures integer DEFAULT 0,
  
  -- Owner
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Index for webhook configs
CREATE INDEX IF NOT EXISTS idx_webhook_configs_event ON webhook_configs(trigger_event);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configs(is_active) WHERE is_active = true;

-- RLS for webhook configs
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

-- Only ADMIN can manage webhooks
CREATE POLICY "Admins can manage webhooks"
ON webhook_configs FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ADMIN', 'super_admin')
  )
);

-- ============================================
-- PART 5: SIGNED DOCUMENTS STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signed-documents',
  'signed-documents',
  false,
  20971520,  -- 20MB for signed documents
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS for signed-documents bucket
DROP POLICY IF EXISTS "Authenticated users can view signed documents" ON storage.objects;
CREATE POLICY "Authenticated users can view signed documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signed-documents');

DROP POLICY IF EXISTS "Authenticated users can upload signed documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload signed documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signed-documents');

-- ============================================
-- PART 6: PUBLIC SIGN ACCESS (ANON)
-- ============================================

-- Allow anonymous access to specific document for signing
DROP POLICY IF EXISTS "Public can view documents via sign token" ON documents;
CREATE POLICY "Public can view documents via sign token"
ON documents FOR SELECT
TO anon
USING (
  public_sign_token IS NOT NULL 
  AND (sign_link_expires_at IS NULL OR sign_link_expires_at > now())
  AND status IN ('sent', 'viewed')
);

-- Allow anonymous to update document when signing
DROP POLICY IF EXISTS "Public can sign documents via token" ON documents;
CREATE POLICY "Public can sign documents via token"
ON documents FOR UPDATE
TO anon
USING (
  public_sign_token IS NOT NULL 
  AND (sign_link_expires_at IS NULL OR sign_link_expires_at > now())
  AND status IN ('sent', 'viewed')
)
WITH CHECK (
  -- Only allow updating signature fields
  status IN ('signed', 'declined', 'viewed')
);

-- ============================================
-- PART 7: HELPER FUNCTIONS
-- ============================================

-- Function to generate public sign link
CREATE OR REPLACE FUNCTION generate_sign_link(
  doc_id uuid,
  expires_in_days integer DEFAULT 30
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sign_token uuid;
  base_url text := 'https://crm.dirq-solutions.nl'; -- Update with your domain
BEGIN
  -- Generate or get existing token
  SELECT public_sign_token INTO sign_token
  FROM documents
  WHERE id = doc_id;
  
  IF sign_token IS NULL THEN
    sign_token := gen_random_uuid();
  END IF;
  
  -- Update document with sign link info
  UPDATE documents
  SET 
    public_sign_token = sign_token,
    sign_link_created_at = now(),
    sign_link_expires_at = now() + (expires_in_days || ' days')::interval,
    status = 'sent'
  WHERE id = doc_id;
  
  -- Log audit event
  INSERT INTO document_signing_audit (document_id, event_type, actor_id, metadata)
  VALUES (doc_id, 'link_generated', auth.uid(), jsonb_build_object(
    'expires_in_days', expires_in_days,
    'expires_at', now() + (expires_in_days || ' days')::interval
  ));
  
  RETURN base_url || '/sign/' || sign_token::text;
END;
$$;

-- Function to log document access
CREATE OR REPLACE FUNCTION log_document_access(
  sign_token uuid,
  ip_addr inet DEFAULT NULL,
  user_agent_str text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc_id uuid;
BEGIN
  -- Get document ID
  SELECT id INTO doc_id
  FROM documents
  WHERE public_sign_token = sign_token
    AND (sign_link_expires_at IS NULL OR sign_link_expires_at > now());
  
  IF doc_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update document status to viewed
  UPDATE documents
  SET status = 'viewed'
  WHERE id = doc_id AND status = 'sent';
  
  -- Log audit event
  INSERT INTO document_signing_audit (
    document_id, 
    event_type, 
    actor_ip, 
    actor_user_agent, 
    metadata
  )
  VALUES (
    doc_id, 
    'document_viewed', 
    ip_addr, 
    user_agent_str,
    jsonb_build_object('accessed_at', now())
  );
  
  RETURN doc_id;
END;
$$;

-- Function to trigger webhook on document signed
CREATE OR REPLACE FUNCTION trigger_document_signed_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only trigger when status changes to 'signed'
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN
    -- Mark webhook as needing to be sent (handled by edge function)
    NEW.webhook_sent := false;
    
    -- Log audit event
    INSERT INTO document_signing_audit (
      document_id, 
      event_type, 
      actor_email,
      actor_ip,
      metadata
    )
    VALUES (
      NEW.id, 
      'signature_completed', 
      NEW.signed_by_email,
      NEW.signer_ip_address,
      jsonb_build_object(
        'signed_at', NEW.signed_at,
        'signed_by', NEW.signed_by_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_document_signed
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_document_signed_webhook();

-- ============================================
-- PART 8: VIEWS FOR AGENT CONTEXT
-- ============================================

-- View for agent-accessible document summary
CREATE OR REPLACE VIEW agent_documents_context AS
SELECT 
  d.id,
  d.title,
  d.file_name,
  d.status,
  d.category,
  d.created_at,
  d.signed_at,
  d.signed_by_name,
  d.signed_by_email,
  c.naam AS company_name,
  c.id AS company_id,
  con.voornaam || ' ' || con.achternaam AS contact_name,
  p.title AS project_title,
  CASE 
    WHEN d.sign_link_expires_at < now() THEN 'expired'
    WHEN d.sign_link_expires_at IS NOT NULL THEN 'active'
    ELSE 'no_link'
  END AS sign_link_status,
  d.public_sign_token
FROM documents d
LEFT JOIN companies c ON d.company_id = c.id
LEFT JOIN contacts con ON d.contact_id = con.id
LEFT JOIN projects p ON d.project_id = p.id;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE document_signing_audit IS 
'Complete audit trail for document signing events - legally binding record';

COMMENT ON TABLE agent_commands IS 
'Log of all AI agent commands for processing and debugging';

COMMENT ON TABLE webhook_configs IS 
'Configuration for outgoing webhooks to n8n, Manus, etc.';

COMMENT ON COLUMN documents.public_sign_token IS 
'Unique token for public signing URL - /sign/{token}';

COMMENT ON COLUMN documents.signer_ip_address IS 
'IP address captured at time of signature for legal audit';

COMMENT ON FUNCTION generate_sign_link IS 
'Generate a public URL for document signing with expiry';

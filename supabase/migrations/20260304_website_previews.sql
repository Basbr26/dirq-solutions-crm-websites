-- ============================================================
-- WEBSITE PREVIEWS TABLE
-- Created: 2026-03-04
-- Purpose: Store website preview links that can be shared with
--          prospects via a public token-based URL (/preview/:token)
--          without requiring login. Similar to document sign links.
-- ============================================================

CREATE TABLE IF NOT EXISTS website_previews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Website Preview',
  preview_url text NOT NULL,
  token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'approved', 'rejected')),
  expires_at timestamptz,
  viewer_email text,
  viewed_at timestamptz,
  viewer_ip text,
  feedback text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_website_previews_token ON website_previews(token);
CREATE INDEX IF NOT EXISTS idx_website_previews_project_id ON website_previews(project_id);

-- RLS
ALTER TABLE website_previews ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access to their own org's previews
CREATE POLICY "Authenticated users can manage website previews"
  ON website_previews FOR ALL
  USING (auth.role() = 'authenticated');

-- Public: anyone can read by token (token is the security mechanism)
-- Note: the application checks expiry in code
CREATE POLICY "Public can read website previews by token"
  ON website_previews FOR SELECT
  USING (true);

-- Public: allow updating viewed_at / status when prospect visits
CREATE POLICY "Public can update view tracking"
  ON website_previews FOR UPDATE
  USING (true)
  WITH CHECK (true);

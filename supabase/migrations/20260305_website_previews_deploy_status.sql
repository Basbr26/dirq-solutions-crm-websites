-- Add deploy_status column to track async Vercel builds
-- Values: 'ready' (live), 'building' (Vercel still building), 'failed' (build error)
ALTER TABLE website_previews
  ADD COLUMN IF NOT EXISTS deploy_status text DEFAULT 'ready'
  CHECK (deploy_status IN ('ready', 'building', 'failed'));

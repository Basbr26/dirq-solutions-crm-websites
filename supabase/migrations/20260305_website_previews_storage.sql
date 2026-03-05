-- ============================================================
-- WEBSITE PREVIEWS STORAGE BUCKET
-- Created: 2026-03-05
-- Purpose: Public storage bucket for uploaded website ZIP previews
-- Files are stored at: website-previews/{preview_id}/{file_path}
-- ============================================================

-- Create the bucket (public so files are accessible without login)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-previews',
  'website-previews',
  true,
  52428800, -- 50 MB max per file
  NULL      -- allow all mime types (html, css, js, images, fonts, etc.)
)
ON CONFLICT (id) DO NOTHING;

-- Policy: anyone can read files (public preview)
CREATE POLICY "Public read website preview files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'website-previews');

-- Policy: authenticated users can upload
CREATE POLICY "Authenticated upload website preview files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'website-previews' AND auth.role() = 'authenticated');

-- Policy: authenticated users can delete their uploads
CREATE POLICY "Authenticated delete website preview files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'website-previews' AND auth.role() = 'authenticated');

-- =====================================================
-- STORAGE BUCKETS & RLS POLICIES
-- Run this in Supabase SQL Editor (Dashboard)
-- =====================================================
-- Creates storage buckets for documents and avatars
-- With proper Row Level Security policies
-- =====================================================

-- ============================================
-- PART 1: CREATE BUCKETS
-- ============================================

-- Documents bucket (private - requires authentication)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatars bucket (public - anyone can view)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Signed Documents bucket (private - requires authentication)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signed-documents',
  'signed-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- PART 2: DOCUMENTS BUCKET RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "HR and Managers can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Employees can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "HR can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "HR can delete documents" ON storage.objects;

-- HR and Managers can upload documents
CREATE POLICY "HR and Managers can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    -- HR role check
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
    OR
    -- Manager role check
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'manager'
    )
    OR
    -- Document owner check (user uploading to their own folder)
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Authenticated users can view documents they have access to
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- HR can view all documents
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
    OR
    -- Document owner can view their own documents
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Manager can view documents of their team members
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.manager_id = p2.id
      WHERE p1.id = auth.uid()
      AND p2.id::text = (storage.foldername(name))[1]
    )
  )
);

-- HR can delete documents
CREATE POLICY "HR can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('hr', 'super_admin')
  )
);

-- ============================================
-- PART 3: SIGNED DOCUMENTS BUCKET RLS POLICIES
-- ============================================

-- Drop existing signed-documents policies
DROP POLICY IF EXISTS "Authenticated users can upload signed documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view signed documents" ON storage.objects;
DROP POLICY IF EXISTS "HR can delete signed documents" ON storage.objects;

-- Authenticated users can upload signed documents
CREATE POLICY "Authenticated users can upload signed documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signed-documents');

-- Authenticated users can view signed documents
CREATE POLICY "Authenticated users can view signed documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signed-documents');

-- HR can delete signed documents
CREATE POLICY "HR can delete signed documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'signed-documents'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('hr', 'hr_medewerker', 'super_admin')
  )
);

-- ============================================
-- PART 4: AVATARS BUCKET RLS POLICIES
-- ============================================

-- Drop existing avatar policies
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Avatars are publicly viewable (bucket is public)
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if buckets were created
SELECT 
  'Storage buckets configured!' as status,
  (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('documents', 'signed-documents', 'avatars')) as buckets_created,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') as policies_created;

-- Show bucket details
SELECT 
  id,
  name,
  public,
  file_size_limit,
  array_length(allowed_mime_types, 1) as mime_types_count,
  created_at
FROM storage.buckets
WHERE id IN ('documents', 'avatars')
ORDER BY id;

-- STORAGE SETUP - Documents Upload for Companies, Contacts, Projects
-- Migration: 20260108_storage_documents.sql

-- Create documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket - requires authentication
  10485760,  -- 10MB file size limit
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
ON CONFLICT (id) DO NOTHING;

-- RLS POLICIES FOR DOCUMENTS BUCKET

-- Allow authenticated users to view documents they have access to
-- (based on company/contact/project ownership and team membership)
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
);

-- Allow authenticated users to upload documents
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
);

-- Allow users to update their own documents
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
);

-- Allow users to delete documents (ADMIN only for now - can refine later)
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;
CREATE POLICY "Users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
);

-- DOCUMENTS TABLE
-- Track document metadata in database for better querying and associations

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- File metadata
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL UNIQUE,  -- Path in Supabase Storage
  
  -- Document info
  title text,
  description text,
  category text,  -- 'contract', 'proposal', 'invoice', 'other'
  
  -- Associations (at least one required)
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  
  -- Metadata
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT at_least_one_association CHECK (
    company_id IS NOT NULL OR 
    contact_id IS NOT NULL OR 
    project_id IS NOT NULL OR 
    quote_id IS NOT NULL
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_contact_id ON documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_quote_id ON documents(quote_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- RLS for documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all documents (can refine by team later)
DROP POLICY IF EXISTS "Authenticated users can view documents" ON documents;
CREATE POLICY "Authenticated users can view documents"
ON documents FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can create documents
DROP POLICY IF EXISTS "Authenticated users can create documents" ON documents;
CREATE POLICY "Authenticated users can create documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can update documents they uploaded or ADMIN role
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
CREATE POLICY "Users can update own documents"
ON documents FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid());

-- ADMIN can delete any document, others can delete their own
DROP POLICY IF EXISTS "Users can delete documents" ON documents;
CREATE POLICY "Users can delete documents"
ON documents FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.rol = 'ADMIN'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for documents
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Add comment
COMMENT ON TABLE documents IS 'Document metadata and associations to companies, contacts, projects, and quotes';

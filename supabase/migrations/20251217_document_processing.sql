-- AI Document Processing Schema
-- Metadata voor geüploade documenten met AI-extracted informatie

CREATE TABLE IF NOT EXISTS document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- AI Analysis Results
  detected_category TEXT CHECK (detected_category IN ('arbeidscontract', 'medisch', 'training', 'persoonlijk', 'factuur', 'overig')),
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  extracted_text TEXT,
  
  -- Extracted Data (JSON voor flexibiliteit)
  extracted_data JSONB DEFAULT '{}',
  -- Voorbeelden:
  -- Voor contract: {"functie": "Developer", "salaris_encrypted": "...", "startdatum": "2025-01-01", ...}
  -- Voor medisch: {"diagnose_code": "M54.5", "beperkingen": "...", "herstel_datum": "..."}
  -- Voor training: {"certificaat_naam": "...", "geldig_tot": "...", "provider": "..."}
  
  -- Validation Results
  is_complete BOOLEAN DEFAULT false,
  is_valid BOOLEAN DEFAULT true,
  validation_notes JSONB DEFAULT '[]',
  missing_elements TEXT[],
  
  -- Document Properties
  has_signature BOOLEAN,
  expiry_date DATE,
  key_dates JSONB DEFAULT '[]',
  mentioned_names TEXT[],
  mentioned_amounts DECIMAL(10,2)[],
  
  -- Processing Status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  
  -- Metadata
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES profiles(id),
  ocr_language TEXT DEFAULT 'nld',
  page_count INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vector Embeddings voor Semantic Search
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  metadata_id UUID REFERENCES document_metadata(id) ON DELETE CASCADE,
  
  -- Vector embedding (1536 dimensions voor OpenAI ada-002)
  embedding vector(1536),
  
  -- Text chunk info
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Auto-generated Tasks from Documents
CREATE TABLE IF NOT EXISTS document_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Task Generation Details
  task_type TEXT NOT NULL,
  task_description TEXT,
  assigned_to UUID REFERENCES profiles(id),
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- AI Reasoning
  generation_reason TEXT,
  auto_generated BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document Access Audit Log
CREATE TABLE IF NOT EXISTS document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'edit', 'delete', 'share')),
  ip_address TEXT,
  user_agent TEXT,
  access_granted BOOLEAN DEFAULT true,
  denial_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX idx_document_metadata_document_id ON document_metadata(document_id);
CREATE INDEX idx_document_metadata_category ON document_metadata(detected_category);
CREATE INDEX idx_document_metadata_status ON document_metadata(processing_status);
CREATE INDEX idx_document_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX idx_document_tasks_document_id ON document_tasks(document_id);
CREATE INDEX idx_document_tasks_assigned_to ON document_tasks(assigned_to);
CREATE INDEX idx_document_access_log_document_id ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_user_id ON document_access_log(user_id);

-- Vector similarity search index (IVFFlat)
CREATE INDEX idx_document_embeddings_vector ON document_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS Policies
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- Users can view metadata of documents they have access to
CREATE POLICY "Users can view document metadata"
  ON document_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_metadata.document_id
      AND (
        documents.uploaded_by = auth.uid()
        OR documents.employee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('hr', 'super_admin')
        )
      )
    )
  );

-- HR can insert/update metadata
CREATE POLICY "HR can manage document metadata"
  ON document_metadata FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin')
    )
  );

-- Users can view embeddings of their documents
CREATE POLICY "Users can view document embeddings"
  ON document_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_embeddings.document_id
      AND (
        documents.uploaded_by = auth.uid()
        OR documents.employee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('hr', 'super_admin')
        )
      )
    )
  );

-- Users can view their document tasks
CREATE POLICY "Users can view document tasks"
  ON document_tasks FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin', 'manager')
    )
  );

-- Log all document access
CREATE POLICY "Users can log own access"
  ON document_access_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- HR can view all access logs
CREATE POLICY "HR can view access logs"
  ON document_access_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin')
    )
  );

-- Function to update updated_at
CREATE TRIGGER update_document_metadata_updated_at
  BEFORE UPDATE ON document_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to log document access
CREATE OR REPLACE FUNCTION log_document_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically log when document is viewed
  -- This can be called from application code
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Semantic Search Function
CREATE OR REPLACE FUNCTION search_documents_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  document_id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE sql
AS $$
  SELECT
    document_embeddings.document_id,
    document_embeddings.chunk_text,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Full-text Search Function
CREATE OR REPLACE FUNCTION search_documents_fulltext(
  search_query text,
  doc_category text DEFAULT NULL
)
RETURNS TABLE (
  document_id uuid,
  title text,
  extracted_text text,
  category text,
  rank float
)
LANGUAGE sql
AS $$
  SELECT
    d.id,
    d.title,
    dm.extracted_text,
    dm.detected_category,
    ts_rank(
      to_tsvector('dutch', COALESCE(d.title, '') || ' ' || COALESCE(dm.extracted_text, '')),
      plainto_tsquery('dutch', search_query)
    ) AS rank
  FROM documents d
  LEFT JOIN document_metadata dm ON dm.document_id = d.id
  WHERE
    to_tsvector('dutch', COALESCE(d.title, '') || ' ' || COALESCE(dm.extracted_text, ''))
    @@ plainto_tsquery('dutch', search_query)
    AND (doc_category IS NULL OR dm.detected_category = doc_category)
  ORDER BY rank DESC;
$$;

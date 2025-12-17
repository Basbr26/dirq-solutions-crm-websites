-- ==============================================================================
-- AI FEATURES DEPLOYMENT SCRIPT
-- Voer dit script uit in Supabase SQL Editor om alle AI features toe te voegen
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. AI HR ASSISTANT CHAT TABLES
-- -----------------------------------------------------------------------------

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add session_id to chat_messages (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Chat Feedback Table
CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Audit Log
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_message_id ON chat_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_user_id ON ai_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_created_at ON ai_audit_log(created_at DESC);

-- Chat RLS Policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view own chat messages
DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;
CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view own chat sessions
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own chat sessions" ON chat_sessions;
CREATE POLICY "Users can manage own chat sessions"
  ON chat_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Users can view feedback on their messages
DROP POLICY IF EXISTS "Users can view own feedback" ON chat_feedback;
CREATE POLICY "Users can view own feedback"
  ON chat_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert feedback" ON chat_feedback;
CREATE POLICY "Users can insert feedback"
  ON chat_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- HR can view all audit logs
DROP POLICY IF EXISTS "HR can view audit logs" ON ai_audit_log;
CREATE POLICY "HR can view audit logs"
  ON ai_audit_log FOR SELECT
  USING (auth.uid() = user_id); -- Simplified: users can view their own audit logs

DROP POLICY IF EXISTS "Users can insert audit logs" ON ai_audit_log;
CREATE POLICY "Users can insert audit logs"
  ON ai_audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Chat Triggers
CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET last_message_at = NEW.created_at
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_last_message ON chat_messages;
CREATE TRIGGER trigger_update_session_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_message();

-- -----------------------------------------------------------------------------
-- 2. AI DOCUMENT PROCESSING TABLES
-- -----------------------------------------------------------------------------

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Document Metadata Table
CREATE TABLE IF NOT EXISTS document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  detected_category TEXT CHECK (detected_category IN ('arbeidscontract', 'medisch', 'training', 'persoonlijk', 'factuur', 'overig')),
  confidence_score DECIMAL(3,2),
  extracted_text TEXT,
  extracted_data JSONB DEFAULT '{}',
  
  is_complete BOOLEAN DEFAULT false,
  is_valid BOOLEAN DEFAULT true,
  validation_notes JSONB DEFAULT '[]',
  missing_elements TEXT[],
  
  has_signature BOOLEAN,
  expiry_date DATE,
  key_dates JSONB DEFAULT '[]',
  mentioned_names TEXT[],
  mentioned_amounts DECIMAL(10,2)[],
  
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES profiles(id),
  ocr_language TEXT DEFAULT 'nld',
  page_count INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document Embeddings Table (for semantic search)
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  metadata_id UUID REFERENCES document_metadata(id) ON DELETE CASCADE,
  
  embedding vector(1536),
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document Tasks Table
CREATE TABLE IF NOT EXISTS document_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  
  task_type TEXT NOT NULL,
  task_description TEXT,
  assigned_to UUID REFERENCES profiles(id),
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
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

-- Document Processing Indexes
CREATE INDEX IF NOT EXISTS idx_document_metadata_document_id ON document_metadata(document_id);
CREATE INDEX IF NOT EXISTS idx_document_metadata_category ON document_metadata(detected_category);
CREATE INDEX IF NOT EXISTS idx_document_metadata_status ON document_metadata(processing_status);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tasks_document_id ON document_tasks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tasks_assigned_to ON document_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_document_access_log_document_id ON document_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_user_id ON document_access_log(user_id);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector ON document_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Document Processing RLS
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- Users can view metadata of documents they have access to
DROP POLICY IF EXISTS "Users can view document metadata" ON document_metadata;
CREATE POLICY "Users can view document metadata"
  ON document_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_metadata.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

-- Users can insert document metadata for their uploads
DROP POLICY IF EXISTS "Users can insert document metadata" ON document_metadata;
CREATE POLICY "Users can insert document metadata"
  ON document_metadata FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_metadata.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update document metadata" ON document_metadata;
CREATE POLICY "Users can update document metadata"
  ON document_metadata FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_metadata.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

-- Users can view embeddings of their documents
DROP POLICY IF EXISTS "Users can view document embeddings" ON document_embeddings;
CREATE POLICY "Users can view document embeddings"
  ON document_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_embeddings.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

-- Users can view their assigned document tasks
DROP POLICY IF EXISTS "Users can view document tasks" ON document_tasks;
CREATE POLICY "Users can view document tasks"
  ON document_tasks FOR SELECT
  USING (assigned_to = auth.uid());

-- Users can log own access
DROP POLICY IF EXISTS "Users can log own access" ON document_access_log;
CREATE POLICY "Users can log own access"
  ON document_access_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own access logs
DROP POLICY IF EXISTS "Users can view own access logs" ON document_access_log;
CREATE POLICY "Users can view own access logs"
  ON document_access_log FOR SELECT
  USING (user_id = auth.uid());

-- Document Processing Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_document_metadata_updated_at ON document_metadata;
CREATE TRIGGER update_document_metadata_updated_at
  BEFORE UPDATE ON document_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. SEARCH FUNCTIONS
-- -----------------------------------------------------------------------------

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
    d.file_name as title,
    dm.extracted_text,
    dm.detected_category as category,
    ts_rank(
      to_tsvector('dutch', COALESCE(d.file_name, '') || ' ' || COALESCE(dm.extracted_text, '')),
      plainto_tsquery('dutch', search_query)
    ) AS rank
  FROM documents d
  LEFT JOIN document_metadata dm ON dm.document_id = d.id
  WHERE
    to_tsvector('dutch', COALESCE(d.file_name, '') || ' ' || COALESCE(dm.extracted_text, ''))
    @@ plainto_tsquery('dutch', search_query)
    AND (doc_category IS NULL OR dm.detected_category = doc_category)
  ORDER BY rank DESC;
$$;

-- ==============================================================================
-- DEPLOYMENT COMPLETE
-- ==============================================================================

-- Verificatie query's:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%chat%' OR table_name LIKE '%document%';
-- SELECT COUNT(*) FROM chat_messages;
-- SELECT COUNT(*) FROM document_metadata;

-- Migration: RAG Vector Store for CRM Chatbot
-- Created: 2026-02-02
-- Purpose: Enable pgvector and create knowledge base for RAG queries

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge base table for CRM data
CREATE TABLE IF NOT EXISTS crm_knowledge (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(768),  -- Gemini text-embedding-004 dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE crm_knowledge IS 'Vector store for RAG-based chatbot queries';
COMMENT ON COLUMN crm_knowledge.content IS 'Text content (company info, project details, summaries)';
COMMENT ON COLUMN crm_knowledge.metadata IS 'JSON metadata (type, company_id, etc.)';
COMMENT ON COLUMN crm_knowledge.embedding IS '768-dimensional embedding vector';

-- Create index for fast similarity search
-- Using ivfflat for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS crm_knowledge_embedding_idx
  ON crm_knowledge
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index on metadata for filtering
CREATE INDEX IF NOT EXISTS crm_knowledge_metadata_idx
  ON crm_knowledge
  USING gin (metadata);

-- Create RPC function for similarity search
CREATE OR REPLACE FUNCTION match_crm_knowledge(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.content,
    ck.metadata,
    1 - (ck.embedding <=> query_embedding) AS similarity
  FROM crm_knowledge ck
  WHERE ck.embedding IS NOT NULL
    AND 1 - (ck.embedding <=> query_embedding) > match_threshold
  ORDER BY ck.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_crm_knowledge IS 'Find similar knowledge chunks using cosine similarity';

-- Create function to upsert knowledge chunks
CREATE OR REPLACE FUNCTION upsert_crm_knowledge(
  p_content TEXT,
  p_metadata JSONB,
  p_embedding VECTOR(768)
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  -- Try to find existing record by metadata (company_id + type)
  SELECT id INTO v_id
  FROM crm_knowledge
  WHERE metadata->>'company_id' = p_metadata->>'company_id'
    AND metadata->>'type' = p_metadata->>'type'
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    -- Update existing
    UPDATE crm_knowledge
    SET content = p_content,
        metadata = p_metadata,
        embedding = p_embedding,
        updated_at = NOW()
    WHERE id = v_id;
  ELSE
    -- Insert new
    INSERT INTO crm_knowledge (content, metadata, embedding)
    VALUES (p_content, p_metadata, p_embedding)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_crm_knowledge IS 'Insert or update knowledge chunk by company_id and type';

-- Enable RLS
ALTER TABLE crm_knowledge ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON crm_knowledge
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Anon can only read (for chatbot queries)
CREATE POLICY "Anon read access" ON crm_knowledge
  FOR SELECT
  TO anon
  USING (true);

-- Grant execute on functions to anon (for chatbot)
GRANT EXECUTE ON FUNCTION match_crm_knowledge TO anon;
GRANT EXECUTE ON FUNCTION upsert_crm_knowledge TO service_role;

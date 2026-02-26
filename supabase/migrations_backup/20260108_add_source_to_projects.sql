-- Add source column to projects table
-- Migration: 20260108_add_source_to_projects.sql

-- Add source column to track lead source
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS source TEXT;

-- Add comment
COMMENT ON COLUMN projects.source IS 'Lead source (e.g., Direct, Referral, Website, LinkedIn, Cold Call)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source);

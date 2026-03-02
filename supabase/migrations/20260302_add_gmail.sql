-- Gmail integration: messages table + profile columns

-- 1. gmail_messages tabel
CREATE TABLE IF NOT EXISTS gmail_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT NOT NULL,
  subject TEXT,
  from_email TEXT,
  from_name TEXT,
  to_emails TEXT[] DEFAULT '{}',
  cc_emails TEXT[] DEFAULT '{}',
  body_text TEXT,
  body_html TEXT,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  labels TEXT[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, gmail_message_id)
);

-- Row Level Security
ALTER TABLE gmail_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gmail messages"
  ON gmail_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail messages"
  ON gmail_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gmail messages"
  ON gmail_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gmail messages"
  ON gmail_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_gmail_messages_user_id ON gmail_messages(user_id);
CREATE INDEX idx_gmail_messages_thread_id ON gmail_messages(user_id, gmail_thread_id);
CREATE INDEX idx_gmail_messages_contact ON gmail_messages(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_gmail_messages_company ON gmail_messages(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_gmail_messages_received ON gmail_messages(user_id, received_at DESC);

-- 2. Gmail OAuth tokens + settings in profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
  ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS gmail_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gmail_sync_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gmail_last_sync TIMESTAMPTZ;

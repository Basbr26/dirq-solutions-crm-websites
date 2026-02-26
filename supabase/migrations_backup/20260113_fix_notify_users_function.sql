-- Fix notify_users function to use correct column names
-- Ensures related_entity_type and related_entity_id are used instead of entity_type/entity_id

CREATE OR REPLACE FUNCTION notify_users(
  p_user_ids UUID[],
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'update',
  p_priority TEXT DEFAULT 'normal',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_deep_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    priority,
    related_entity_type,
    related_entity_id,
    deep_link,
    metadata,
    status
  )
  SELECT
    unnest(p_user_ids),
    p_title,
    p_message,
    p_type,
    p_priority,
    p_entity_type,
    p_entity_id,
    p_deep_link,
    p_metadata,
    'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_employee_note_stats function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_employee_note_stats(p_employee_id UUID)
RETURNS JSON AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total_notes', COUNT(*),
    'pending_follow_ups', COUNT(*) FILTER (WHERE follow_up_required = TRUE AND follow_up_completed = FALSE),
    'last_30_days', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
    'by_category', COALESCE(
      (SELECT json_object_agg(category, cnt)
       FROM (
         SELECT category, COUNT(*) as cnt
         FROM hr_notes
         WHERE employee_id = p_employee_id
         GROUP BY category
       ) cat_counts),
      '{}'::json
    )
  )
  INTO v_stats
  FROM hr_notes
  WHERE employee_id = p_employee_id;
  
  RETURN COALESCE(v_stats, json_build_object(
    'total_notes', 0,
    'pending_follow_ups', 0,
    'last_30_days', 0,
    'by_category', '{}'::json
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_employee_note_stats TO authenticated;

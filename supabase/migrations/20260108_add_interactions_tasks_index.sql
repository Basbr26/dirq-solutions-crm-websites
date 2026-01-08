-- Add performance index for tasks queries
-- This fixes the missing index on interactions.due_date
-- Reported in: CALENDAR_TASKS_ACTIVITIES_ANALYSIS.md - Issue #6

-- Drop existing single-column index if it exists (to avoid redundancy)
DROP INDEX IF EXISTS idx_interactions_due_date;

-- Create composite index for efficient task queries
-- This index covers the most common query pattern:
-- WHERE user_id = ? AND is_task = true AND due_date IS NOT NULL AND due_date >= ?
CREATE INDEX IF NOT EXISTS idx_interactions_tasks 
ON interactions(user_id, is_task, due_date)
WHERE is_task = true AND due_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_interactions_tasks IS 
'Composite index for efficient task queries. Covers user_id, is_task, and due_date filters. Used by CalendarPage.tsx and TasksList.tsx components.';

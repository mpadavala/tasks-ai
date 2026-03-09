-- Add task_status to entries for Status dropdown (Not Started, In Progress, Done).
-- Run this in your Supabase SQL editor if the column does not exist yet.
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS task_status TEXT DEFAULT 'not_started';

-- Optional: backfill existing rows (null or missing -> not_started)
UPDATE entries SET task_status = 'not_started' WHERE task_status IS NULL;

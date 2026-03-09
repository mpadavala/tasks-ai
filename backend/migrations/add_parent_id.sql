-- Add parent_id to entries for subtasks (self-reference).
-- Run this in your Supabase SQL editor if the column does not exist yet.
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entries_parent_id ON entries(parent_id);

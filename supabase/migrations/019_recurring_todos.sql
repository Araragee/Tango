-- Migration 019: Add recurrence to todos.
-- recurrence: cadence for auto-spawning next instance on completion.
-- recurrence_next_at: the due date the next instance should get.
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS recurrence TEXT
    CHECK (recurrence IN ('none', 'daily', 'weekly', 'biweekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_next_at TEXT;

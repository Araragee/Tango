-- Migration 017: Add paid_by to transactions for settle-up feature.
-- Nullable — existing rows default to NULL (treated as "unknown" in UI).
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

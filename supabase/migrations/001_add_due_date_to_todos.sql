-- Migration 001: Add due_date to todos
-- Run in: Supabase Dashboard > SQL Editor

alter table public.todos
  add column if not exists due_date text;

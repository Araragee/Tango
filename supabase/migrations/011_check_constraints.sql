-- Migration 011: Defensive CHECK constraints.
-- Server-side bounds to reject malformed or hostile input even if the client lies.
-- Run in: Supabase Dashboard > SQL Editor

-- ── profiles ─────────────────────────────────────────────────────────────────
alter table public.profiles
  drop constraint if exists profiles_display_name_len;
alter table public.profiles
  add constraint profiles_display_name_len
  check (length(trim(display_name)) between 1 and 60);

-- ── households ───────────────────────────────────────────────────────────────
alter table public.households
  drop constraint if exists households_invite_code_len;
alter table public.households
  add constraint households_invite_code_len
  check (length(invite_code) between 4 and 32);

-- ── transactions ─────────────────────────────────────────────────────────────
alter table public.transactions
  drop constraint if exists transactions_title_len,
  drop constraint if exists transactions_amount_range,
  drop constraint if exists transactions_category_len,
  drop constraint if exists transactions_note_len,
  drop constraint if exists transactions_date_format;

alter table public.transactions
  add constraint transactions_title_len    check (length(trim(title)) between 1 and 200),
  add constraint transactions_amount_range check (amount between -1000000000 and 1000000000),
  add constraint transactions_category_len check (length(category) between 1 and 60),
  add constraint transactions_note_len     check (note is null or length(note) <= 1000),
  add constraint transactions_date_format  check (date ~ '^\d{4}-\d{2}-\d{2}');

-- ── goals ────────────────────────────────────────────────────────────────────
alter table public.goals
  drop constraint if exists goals_title_len,
  drop constraint if exists goals_target_positive,
  drop constraint if exists goals_saved_nonneg,
  drop constraint if exists goals_progress_range,
  drop constraint if exists goals_status_enum,
  drop constraint if exists goals_description_len;

alter table public.goals
  add constraint goals_title_len        check (length(trim(title)) between 1 and 200),
  add constraint goals_target_positive  check (target > 0),
  add constraint goals_saved_nonneg     check (saved >= 0),
  add constraint goals_progress_range   check (progress between 0 and 100),
  add constraint goals_status_enum      check (status in ('Behind', 'On Track', 'Completed')),
  add constraint goals_description_len  check (description is null or length(description) <= 1000);

-- ── todos ────────────────────────────────────────────────────────────────────
alter table public.todos
  drop constraint if exists todos_text_len,
  drop constraint if exists todos_category_len,
  drop constraint if exists todos_subtext_len,
  drop constraint if exists todos_assigned_enum;

-- Coerce any legacy or null values to a valid enum member so the check passes.
update public.todos
  set assigned = 'me'
  where assigned is null or assigned not in ('me', 'partner', 'both');

alter table public.todos
  add constraint todos_text_len        check (length(trim(text)) between 1 and 500),
  add constraint todos_category_len    check (length(category) between 1 and 60),
  add constraint todos_subtext_len     check (subtext is null or length(subtext) <= 1000),
  add constraint todos_assigned_enum   check (assigned in ('me', 'partner', 'both'));

-- ── calendar_events ──────────────────────────────────────────────────────────
alter table public.calendar_events
  drop constraint if exists events_title_len,
  drop constraint if exists events_category_len,
  drop constraint if exists events_date_format,
  drop constraint if exists events_time_format;

alter table public.calendar_events
  add constraint events_title_len    check (length(trim(title)) between 1 and 200),
  add constraint events_category_len check (length(category) between 1 and 60),
  add constraint events_date_format  check (date ~ '^\d{4}-\d{2}-\d{2}'),
  add constraint events_time_format  check (time ~ '^\d{1,2}:\d{2}');

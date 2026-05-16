-- Migration 009: Schema upgrades to existing tables.
-- Adds notes/receipts/completion timestamps/optimistic-version/updated_at on writes.
-- Run in: Supabase Dashboard > SQL Editor

-- ── transactions ─────────────────────────────────────────────────────────────
alter table public.transactions
  add column if not exists note          text,
  add column if not exists receipt_url   text,
  add column if not exists updated_at    timestamptz not null default now(),
  add column if not exists updated_by    uuid references auth.users(id) on delete set null,
  add column if not exists version       int not null default 1;

-- ── goals ────────────────────────────────────────────────────────────────────
alter table public.goals
  add column if not exists completed_at  timestamptz,
  add column if not exists version       int not null default 1;

-- Backfill completed_at for already-completed goals
update public.goals
   set completed_at = updated_at
 where status = 'Completed' and completed_at is null;

-- Auto-set completed_at when status flips to Completed
create or replace function public.goals_set_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Completed' and (old.status is distinct from 'Completed') and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'Completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists goals_completed_at on public.goals;

create trigger goals_completed_at
  before update on public.goals
  for each row execute function public.goals_set_completed_at();

-- ── calendar_events ──────────────────────────────────────────────────────────
alter table public.calendar_events
  add column if not exists updated_at  timestamptz not null default now(),
  add column if not exists updated_by  uuid references auth.users(id) on delete set null,
  add column if not exists version     int not null default 1;

-- ── todos ────────────────────────────────────────────────────────────────────
-- updated_at + updated_by already exist; add version + structured assignee_id
alter table public.todos
  add column if not exists version       int not null default 1,
  add column if not exists assignee_id   uuid references auth.users(id) on delete set null;

-- ── auto-bump updated_at + version on every UPDATE ──────────────────────────
create or replace function public.bump_row_version()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.version   := coalesce(old.version, 0) + 1;
  return new;
end;
$$;

drop trigger if exists bump_transactions     on public.transactions;
drop trigger if exists bump_goals            on public.goals;
drop trigger if exists bump_todos            on public.todos;
drop trigger if exists bump_calendar_events  on public.calendar_events;

create trigger bump_transactions     before update on public.transactions     for each row execute function public.bump_row_version();
create trigger bump_goals            before update on public.goals            for each row execute function public.bump_row_version();
create trigger bump_todos            before update on public.todos            for each row execute function public.bump_row_version();
create trigger bump_calendar_events  before update on public.calendar_events  for each row execute function public.bump_row_version();

-- Migration 005: Audit log + activity feed source.
-- Captures every write to transactions / goals / todos / calendar_events.
-- Powers "Sam added $40 Groceries" feed and dispute resolution.
-- Run in: Supabase Dashboard > SQL Editor

create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete set null,
  table_name   text not null,
  row_id       uuid not null,
  action       text not null check (action in ('insert', 'update', 'delete')),
  before       jsonb,
  after        jsonb,
  summary      text,
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_household_created_idx
  on public.audit_log (household_id, created_at desc);

create index if not exists audit_log_row_idx
  on public.audit_log (table_name, row_id);

alter table public.audit_log enable row level security;

create policy "audit_log_select" on public.audit_log for select
  using (public.is_household_member(household_id));

-- No client-side write policies; written only by triggers (definer)

create or replace function public.audit_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hid      uuid;
  uid      uuid;
  rid      uuid;
  rec_before jsonb;
  rec_after  jsonb;
  summary  text;
begin
  uid := auth.uid();

  if tg_op = 'DELETE' then
    rec_before := to_jsonb(old);
    rec_after  := null;
    hid := (rec_before->>'household_id')::uuid;
    rid := (rec_before->>'id')::uuid;
  elsif tg_op = 'UPDATE' then
    rec_before := to_jsonb(old);
    rec_after  := to_jsonb(new);
    hid := (rec_after->>'household_id')::uuid;
    rid := (rec_after->>'id')::uuid;
  else -- INSERT
    rec_before := null;
    rec_after  := to_jsonb(new);
    hid := (rec_after->>'household_id')::uuid;
    rid := (rec_after->>'id')::uuid;
  end if;

  summary := tg_table_name || ' ' || tg_op;

  insert into public.audit_log (household_id, user_id, table_name, row_id, action, before, after, summary)
    values (hid, uid, tg_table_name, rid, lower(tg_op), rec_before, rec_after, summary);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Attach to data tables
drop trigger if exists audit_transactions     on public.transactions;
drop trigger if exists audit_goals            on public.goals;
drop trigger if exists audit_todos            on public.todos;
drop trigger if exists audit_calendar_events  on public.calendar_events;

create trigger audit_transactions     after insert or update or delete on public.transactions     for each row execute function public.audit_writes();
create trigger audit_goals            after insert or update or delete on public.goals            for each row execute function public.audit_writes();
create trigger audit_todos            after insert or update or delete on public.todos            for each row execute function public.audit_writes();
create trigger audit_calendar_events  after insert or update or delete on public.calendar_events  for each row execute function public.audit_writes();

alter publication supabase_realtime add table public.audit_log;
